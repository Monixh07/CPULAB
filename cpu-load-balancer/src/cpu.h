/*
 * cpu.h - one simulated CPU.
 *
 * Each CPU owns a ready queue (linked list of process indices) and runs
 * exactly one process at a time using its scheduling policy:
 *   FCFS - first-come first-served, run to completion
 *   SJF  - shortest-job-first (non-preemptive), run to completion
 *   RR   - round robin, preempt every `quantum` ticks
 */
#ifndef CPU_H
#define CPU_H

#include "process.h"

#define MAXCPU 16

enum {
    SCHED_FCFS = 0,
    SCHED_SJF  = 1,
    SCHED_RR   = 2
};

typedef struct QNode {
    int idx;              /* index into the global Process array */
    struct QNode *next;
} QNode;

typedef struct {
    int id;
    QNode *head, *tail;   /* ready queue */
    int count;            /* processes waiting in queue */
    int running;          /* index of running process, -1 = idle */
    int quantum_left;     /* ticks left in this RR quantum */
    int scheduler;        /* SCHED_* */
    long busy_ticks;      /* ticks spent executing */
    long idle_ticks;      /* ticks spent idle */
} CPU;

const char *sched_name(int s);

void cpu_init(CPU *c, int id, int scheduler);
void cpu_cleanup(CPU *c);              /* frees any leftover queue nodes */
void cpu_enqueue(CPU *c, int idx);     /* add to tail of ready queue */
int  cpu_dequeue(CPU *c);              /* remove from head, -1 if empty */
int  cpu_dequeue_min(CPU *c, const Process *procs);   /* SJF pick */
int  cpu_steal_largest(CPU *c, const Process *procs); /* migration pick */

/* Current load = remaining ticks of running process + all queued work. */
long cpu_load(const CPU *c, const Process *procs);

#endif
