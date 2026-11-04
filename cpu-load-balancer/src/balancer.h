/*
 * balancer.h - load-balancing strategies.
 *
 * Static assignment (when a process arrives, pick a CPU for it):
 *   STRAT_RR     - round robin: CPU0, CPU1, ..., CPU0, ...
 *   STRAT_LEAST  - least-loaded: CPU with the smallest remaining work
 *   STRAT_RANDOM - uniform random CPU
 *
 * Dynamic rebalancing (optional, runs every N ticks):
 *   balancer_migrate() moves the largest waiting job from the most-loaded
 *   CPU to the least-loaded CPU when their load gap exceeds a threshold.
 */
#ifndef BALANCER_H
#define BALANCER_H

#include "cpu.h"

enum {
    STRAT_RR = 0,
    STRAT_LEAST = 1,
    STRAT_RANDOM = 2,
    STRAT_COUNT = 3
};

const char *strat_name(int s);

/* Choose a CPU for a new process. `rr_next` is round-robin cursor state
 * owned by the caller. Returns the chosen CPU id. */
int balancer_assign(int strategy, CPU *cpus, int ncpu,
                    const Process *procs, int *rr_next);

/* Try one migration step; leave running processes in place. */
void balancer_migrate(CPU *cpus, int ncpu, Process *procs, int threshold);

#endif
