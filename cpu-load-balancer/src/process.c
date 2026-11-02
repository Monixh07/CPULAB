#include <stdio.h>
#include <stdlib.h>
#include "process.h"

void process_reset(Process *p) {
    p->remaining = p->burst;
    p->start_time = -1;
    p->completion_time = -1;
    p->cpu_id = -1;
}

int generate_workload(Process *procs, int n,
                      int max_arrival, int max_burst, unsigned seed) {
    if (n < 1) n = 1;
    if (n > MAXPROC) n = MAXPROC;
    if (max_arrival < 0) max_arrival = 0;
    if (max_burst < 1) max_burst = 1;

    srand(seed);
    for (int i = 0; i < n; i++) {
        procs[i].pid = i + 1;
        procs[i].arrival = (max_arrival == 0) ? 0 : rand() % (max_arrival + 1);
        procs[i].burst = 1 + rand() % max_burst;
        procs[i].priority = 1 + rand() % 5;
        process_reset(&procs[i]);
    }
    return n;
}

int load_workload(const char *path, Process *procs, int maxn) {
    FILE *f = fopen(path, "r");
    if (!f) return -1;

    int n = 0;
    if (fscanf(f, "%d", &n) != 1 || n < 1 || n > maxn) {
        fclose(f);
        return -1;
    }
    for (int i = 0; i < n; i++) {
        int a, b, p;
        if (fscanf(f, "%d %d %d", &a, &b, &p) != 3 || a < 0 || b < 1) {
            fclose(f);
            return -1;
        }
        procs[i].pid = i + 1;
        procs[i].arrival = a;
        procs[i].burst = b;
        procs[i].priority = p;
        process_reset(&procs[i]);
    }
    fclose(f);
    return n;
}

int save_workload(const char *path, const Process *procs, int n) {
    FILE *f = fopen(path, "w");
    if (!f) return -1;
    fprintf(f, "%d\n", n);
    for (int i = 0; i < n; i++)
        fprintf(f, "%d %d %d\n",
                procs[i].arrival, procs[i].burst, procs[i].priority);
    fclose(f);
    return 0;
}

void print_workload(const Process *procs, int n) {
    printf("\n  PID   Arrival   Burst   Priority\n");
    printf("  ---   -------   -----   --------\n");
    for (int i = 0; i < n; i++)
        printf("  P%-4d  %-7d   %-5d   %d\n",
               procs[i].pid, procs[i].arrival,
               procs[i].burst, procs[i].priority);
    printf("  Total processes: %d\n", n);
}
