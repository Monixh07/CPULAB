/*
 * sim.h - the discrete-tick simulation engine.
 *
 * Each tick:
 *   1. newly arrived processes are assigned to CPUs (load balancing),
 *   2. optionally one migration step rebalances overloaded CPUs,
 *   3. every CPU executes one tick of its running process (or idles),
 *   4. finished processes record completion / turnaround / waiting times.
 */
#ifndef SIM_H
#define SIM_H

#include "balancer.h"

typedef struct {
    CPU cpus[MAXCPU];
    int ncpu;

    Process procs[MAXPROC];
    int nprocs;

    int strategy;          /* STRAT_* : how arrivals are assigned */
    int scheduler;         /* SCHED_* : per-CPU scheduling policy */
    int quantum;           /* RR time quantum (ticks) */

    int migration;         /* 1 = dynamic rebalancing on */
    int migrate_interval;  /* run the migrator every N ticks */
    int migrate_threshold; /* migrate only if load gap exceeds this */

    int live;              /* 1 = animated dashboard while running */
    int delay_ms;          /* pause between ticks in live mode */

    int time;              /* current tick */
    int completed;         /* processes finished so far */
} Sim;

/* Defaults for every field (call before touching anything else). */
void sim_defaults(Sim *s);

/* Prepare CPUs + reset processes for a run. Call before sim_run(). */
void sim_setup(Sim *s);

/* Run until every process completes. Returns the makespan (total ticks). */
int sim_run(Sim *s);

/* Free per-run queue memory. Call after stats are collected. */
void sim_cleanup(Sim *s);

#endif
