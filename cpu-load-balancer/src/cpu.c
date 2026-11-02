#include <stdlib.h>
#include "cpu.h"

const char *sched_name(int s) {
    switch (s) {
        case SCHED_FCFS: return "FCFS";
        case SCHED_SJF:  return "SJF";
        case SCHED_RR:   return "Round Robin";
        default:         return "Unknown";
    }
}

void cpu_init(CPU *c, int id, int scheduler) {
    c->id = id;
    c->head = c->tail = NULL;
    c->count = 0;
    c->running = -1;
    c->quantum_left = 0;
    c->scheduler = scheduler;
    c->busy_ticks = 0;
    c->idle_ticks = 0;
}

void cpu_cleanup(CPU *c) {
    QNode *n = c->head;
    while (n) {
        QNode *tmp = n->next;
        free(n);
        n = tmp;
    }
    c->head = c->tail = NULL;
    c->count = 0;
    c->running = -1;
}

void cpu_enqueue(CPU *c, int idx) {
    QNode *n = (QNode *)malloc(sizeof(QNode));
    if (!n) return; /* out of memory: drop (simulation stays consistent) */
    n->idx = idx;
    n->next = NULL;
    if (c->tail) c->tail->next = n;
    else c->head = n;
    c->tail = n;
    c->count++;
}

int cpu_dequeue(CPU *c) {
    if (!c->head) return -1;
    QNode *n = c->head;
    int idx = n->idx;
    c->head = n->next;
    if (!c->head) c->tail = NULL;
    free(n);
    c->count--;
    return idx;
}

/* Remove and return the waiting process with the smallest remaining time.
 * Used by SJF. Ties keep FIFO order. */
int cpu_dequeue_min(CPU *c, const Process *procs) {
    if (!c->head) return -1;
    QNode *best = c->head, *best_prev = NULL;
    QNode *prev = c->head, *cur = c->head->next;
    while (cur) {
        if (procs[cur->idx].remaining < procs[best->idx].remaining) {
            best = cur;
            best_prev = prev;
        }
        prev = cur;
        cur = cur->next;
    }
    if (best_prev) best_prev->next = best->next;
    else c->head = best->next;
    if (best == c->tail) c->tail = best_prev;
    int idx = best->idx;
    free(best);
    c->count--;
    return idx;
}

/* Remove and return the waiting process with the largest remaining time.
 * Used by the migration engine: moving the biggest job relieves the most
 * load from an overloaded CPU. Never touches the running process. */
int cpu_steal_largest(CPU *c, const Process *procs) {
    if (!c->head) return -1;
    QNode *best = c->head, *best_prev = NULL;
    QNode *prev = c->head, *cur = c->head->next;
    while (cur) {
        if (procs[cur->idx].remaining > procs[best->idx].remaining) {
            best = cur;
            best_prev = prev;
        }
        prev = cur;
        cur = cur->next;
    }
    if (best_prev) best_prev->next = best->next;
    else c->head = best->next;
    if (best == c->tail) c->tail = best_prev;
    int idx = best->idx;
    free(best);
    c->count--;
    return idx;
}

long cpu_load(const CPU *c, const Process *procs) {
    long load = 0;
    if (c->running != -1)
        load += procs[c->running].remaining;
    for (QNode *n = c->head; n; n = n->next)
        load += procs[n->idx].remaining;
    return load;
}
