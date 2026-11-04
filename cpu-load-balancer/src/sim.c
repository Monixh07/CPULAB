#include "sim.h"
#include "viz.h"
#include "platform.h"

void sim_defaults(Sim *s) {
    s->ncpu = 4;
    s->nprocs = 0;
    s->strategy = STRAT_LEAST;
    s->scheduler = SCHED_RR;
    s->quantum = 4;
    s->migration = 1;
    s->migrate_interval = 15;
    s->migrate_threshold = 8;
    s->live = 1;
    s->delay_ms = 120;
    s->time = 0;
    s->completed = 0;
}

void sim_setup(Sim *s) {
    for (int i = 0; i < s->ncpu; i++)
        cpu_init(&s->cpus[i], i, s->scheduler);
    for (int i = 0; i < s->nprocs; i++)
        process_reset(&s->procs[i]);
    s->time = 0;
    s->completed = 0;
}

void sim_cleanup(Sim *s) {
    for (int i = 0; i < s->ncpu; i++)
        cpu_cleanup(&s->cpus[i]);
}

int sim_run(Sim *s) {
    int rr_next = 0;

    while (s->completed < s->nprocs) {
        /* 1. arrivals -> load balancer assigns each to a CPU */
        for (int i = 0; i < s->nprocs; i++) {
            if (s->procs[i].arrival == s->time && s->procs[i].cpu_id == -1) {
                int c = balancer_assign(s->strategy, s->cpus, s->ncpu,
                                        s->procs, &rr_next);
                s->procs[i].cpu_id = c;
                cpu_enqueue(&s->cpus[c], i);
            }
        }

        /* 2. dynamic rebalancing */
        if (s->migration && s->migrate_interval > 0 &&
            s->time > 0 && s->time % s->migrate_interval == 0) {
            balancer_migrate(s->cpus, s->ncpu, s->procs,
                             s->migrate_threshold);
        }

        /* 3. every CPU executes one tick */
        for (int c = 0; c < s->ncpu; c++) {
            CPU *cpu = &s->cpus[c];

            if (cpu->running == -1) {
                int nxt = (cpu->scheduler == SCHED_SJF)
                              ? cpu_dequeue_min(cpu, s->procs)
                              : cpu_dequeue(cpu); /* FCFS and RR: head */
                if (nxt != -1) {
                    cpu->running = nxt;
                    cpu->quantum_left = s->quantum;
                    if (s->procs[nxt].start_time == -1)
                        s->procs[nxt].start_time = s->time;
                }
            }

            if (cpu->running != -1) {
                Process *p = &s->procs[cpu->running];
                p->remaining--;
                cpu->busy_ticks++;
                cpu->quantum_left--;

                if (p->remaining == 0) {
                    p->completion_time = s->time + 1;
                    s->completed++;
                    cpu->running = -1;
                } else if (cpu->scheduler == SCHED_RR &&
                           cpu->quantum_left == 0) {
                    cpu_enqueue(cpu, cpu->running); /* quantum expired */
                    cpu->running = -1;
                }
            } else {
                cpu->idle_ticks++;
            }
        }

        if (s->live) {
            viz_dashboard(s);
            msleep(s->delay_ms);
        }

        s->time++;
        if (s->time > 1000000) break; /* safety net, never hit in practice */
    }
    return s->time; /* makespan */
}
