#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "stats.h"
#include "viz.h"

void stats_compute(const Sim *s, Stats *st) {
    long tot_wt = 0, tot_tat = 0;
    for (int i = 0; i < s->nprocs; i++) {
        int tat = s->procs[i].completion_time - s->procs[i].arrival;
        int wt = tat - s->procs[i].burst;
        tot_tat += tat;
        tot_wt += wt;
    }
    st->avg_wt = s->nprocs ? (double)tot_wt / s->nprocs : 0.0;
    st->avg_tat = s->nprocs ? (double)tot_tat / s->nprocs : 0.0;
    st->makespan = s->time;

    st->min_util = 1.0;
    st->max_util = 0.0;
    for (int c = 0; c < s->ncpu; c++) {
        long total = s->cpus[c].busy_ticks + s->cpus[c].idle_ticks;
        double u = total ? (double)s->cpus[c].busy_ticks / total : 0.0;
        st->util[c] = u;
        if (u < st->min_util) st->min_util = u;
        if (u > st->max_util) st->max_util = u;
    }
    st->imbalance = st->max_util - st->min_util;
}

void stats_print(const Sim *s, const Stats *st) {
    printf("\n  ---- Per-process results ----\n");
    printf("  PID   CPU   Arrival  Burst  Complete   Turnaround  Waiting\n");
    for (int i = 0; i < s->nprocs; i++) {
        const Process *p = &s->procs[i];
        int tat = p->completion_time - p->arrival;
        int wt = tat - p->burst;
        printf("  P%-4d CPU%-3d %-7d  %-5d  %-8d   %-10d  %d\n",
               p->pid, p->cpu_id, p->arrival, p->burst,
               p->completion_time, tat, wt);
    }
    printf("\n  Average waiting time    : %.2f ticks\n", st->avg_wt);
    printf("  Average turnaround time : %.2f ticks\n", st->avg_tat);
    printf("  Makespan                : %d ticks\n", st->makespan);

    viz_bars(s, st);
}

/* Copy only the configuration + workload (never CPU run state). */
static void clone_config(const Sim *src, Sim *dst) {
    dst->ncpu = src->ncpu;
    dst->nprocs = src->nprocs;
    memcpy(dst->procs, src->procs, sizeof(Process) * (size_t)src->nprocs);
    dst->scheduler = src->scheduler;
    dst->quantum = src->quantum;
    dst->migration = src->migration;
    dst->migrate_interval = src->migrate_interval;
    dst->migrate_threshold = src->migrate_threshold;
    dst->live = 0;          /* comparison runs are never animated */
    dst->delay_ms = 0;
}

void compare_strategies(const Sim *base) {
    Stats st[STRAT_COUNT];

    printf("\n  Comparing load-balancing strategies on the same workload\n");
    printf("  (%d processes, %d CPUs, per-CPU scheduler: %s, quantum %d, migration %s)\n\n",
           base->nprocs, base->ncpu, sched_name(base->scheduler),
           base->quantum, base->migration ? "ON" : "OFF");

    srand(12345); /* same "random" assignments every run -> fair compare */
    for (int k = 0; k < STRAT_COUNT; k++) {
        Sim s;
        clone_config(base, &s);
        s.strategy = k;
        sim_setup(&s);
        sim_run(&s);
        stats_compute(&s, &st[k]);
        sim_cleanup(&s);
    }

    printf("  +----------------+----------+----------+----------+-----------+----------+\n");
    printf("  | Strategy       | Avg wait | Avg TAT  | Makespan | Imbalance | Min util |\n");
    printf("  +----------------+----------+----------+----------+-----------+----------+\n");
    for (int k = 0; k < STRAT_COUNT; k++) {
        printf("  | %-14s | %8.2f | %8.2f | %8d | %9.1f%% | %7.1f%% |\n",
               strat_name(k), st[k].avg_wt, st[k].avg_tat, st[k].makespan,
               st[k].imbalance * 100.0, st[k].min_util * 100.0);
    }
    printf("  +----------------+----------+----------+----------+-----------+----------+\n");

    /* verdicts */
    int best_wt = 0, best_bal = 0;
    for (int k = 1; k < STRAT_COUNT; k++) {
        if (st[k].avg_wt < st[best_wt].avg_wt) best_wt = k;
        if (st[k].imbalance < st[best_bal].imbalance) best_bal = k;
    }
    printf("\n  Verdict:\n");
    printf("   * Lowest average waiting time : %s (%.2f ticks)\n",
           strat_name(best_wt), st[best_wt].avg_wt);
    printf("   * Most balanced CPUs          : %s (imbalance %.1f%%)\n",
           strat_name(best_bal), st[best_bal].imbalance * 100.0);
    if (best_wt == STRAT_LEAST || best_bal == STRAT_LEAST)
        printf("   -> Least-Loaded wins because it looks at actual remaining\n"
               "      work instead of blindly rotating, so no CPU sits idle\n"
               "      while another has a long queue.\n");
}
