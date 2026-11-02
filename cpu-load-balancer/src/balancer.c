#include <stdlib.h>
#include "balancer.h"

const char *strat_name(int s) {
    switch (s) {
        case STRAT_RR:     return "Round Robin";
        case STRAT_LEAST:  return "Least Loaded";
        case STRAT_RANDOM: return "Random";
        default:           return "Unknown";
    }
}

int balancer_assign(int strategy, CPU *cpus, int ncpu,
                    const Process *procs, int pidx, int *rr_next) {
    (void)pidx; /* assignment does not depend on the process itself here */
    switch (strategy) {
        case STRAT_RR: {
            int c = (*rr_next) % ncpu;
            (*rr_next)++;
            return c;
        }
        case STRAT_LEAST: {
            int best = 0;
            long best_load = cpu_load(&cpus[0], procs);
            for (int i = 1; i < ncpu; i++) {
                long l = cpu_load(&cpus[i], procs);
                if (l < best_load) {
                    best_load = l;
                    best = i;
                }
            }
            return best;
        }
        case STRAT_RANDOM:
        default:
            return rand() % ncpu;
    }
}

int balancer_migrate(CPU *cpus, int ncpu, Process *procs,
                     int threshold, int *moved) {
    *moved = 0;
    if (ncpu < 2) return -1;

    int hi = 0, lo = 0;
    long hi_load = cpu_load(&cpus[0], procs);
    long lo_load = hi_load;
    for (int i = 1; i < ncpu; i++) {
        long l = cpu_load(&cpus[i], procs);
        if (l > hi_load) { hi_load = l; hi = i; }
        if (l < lo_load) { lo_load = l; lo = i; }
    }
    if (hi == lo) return -1;
    if (hi_load - lo_load <= threshold) return -1; /* balanced enough */

    /* Move the biggest waiting job off the overloaded CPU. The running
     * process is never migrated (that would need a context switch). */
    int idx = cpu_steal_largest(&cpus[hi], procs);
    if (idx == -1) return -1; /* nothing waiting to move */

    procs[idx].cpu_id = lo;
    cpu_enqueue(&cpus[lo], idx);
    *moved = 1;
    return idx;
}
