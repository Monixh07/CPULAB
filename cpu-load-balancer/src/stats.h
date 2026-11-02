/*
 * stats.h - metrics that let us *compare* load-balancing strategies:
 *   waiting time, turnaround time, per-CPU utilization, load imbalance.
 */
#ifndef STATS_H
#define STATS_H

#include "sim.h"

typedef struct {
    double avg_wt;        /* average waiting time (ticks) */
    double avg_tat;       /* average turnaround time (ticks) */
    double util[MAXCPU];  /* per-CPU utilization, 0.0 - 1.0 */
    double min_util;
    double max_util;
    double imbalance;     /* max_util - min_util: 0 = perfectly balanced */
    int makespan;         /* total ticks to finish everything */
} Stats;

void stats_compute(const Sim *s, Stats *st);
void stats_print(const Sim *s, const Stats *st);

/* Run the same workload under every strategy and print a comparison
 * table with a verdict. `base` carries the config + workload; it is
 * not modified. */
void compare_strategies(const Sim *base);

#endif
