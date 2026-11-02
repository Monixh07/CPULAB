#include <stdio.h>
#include "viz.h"
#include "platform.h"

#define BAR_W 28

/* Print a horizontal bar: [##########----------] 35% */
static void bar(double frac, int width) {
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    int fill = (int)(frac * width + 0.5);
    putchar('[');
    for (int i = 0; i < width; i++)
        putchar(i < fill ? '#' : '-');
    printf("] %5.1f%%", frac * 100.0);
}

void viz_dashboard(const Sim *s) {
    clear_screen();
    printf("=== CPU Load Balancing Simulator ===   tick %d   done %d/%d\n",
           s->time, s->completed, s->nprocs);
    printf("strategy: %s | per-CPU scheduler: %s | migration: %s\n\n",
           strat_name(s->strategy), sched_name(s->scheduler),
           s->migration ? "ON" : "OFF");

    for (int c = 0; c < s->ncpu; c++) {
        const CPU *cpu = &s->cpus[c];
        long total = cpu->busy_ticks + cpu->idle_ticks;
        double u = total ? (double)cpu->busy_ticks / total : 0.0;

        printf("CPU%d ", cpu->id);
        bar(u, BAR_W);

        if (cpu->running != -1) {
            const Process *p = &s->procs[cpu->running];
            printf("  RUN P%d (rem %d)", p->pid, p->remaining);
        } else {
            printf("  idle");
        }

        printf("   queue:");
        int shown = 0;
        for (QNode *n = cpu->head; n && shown < 8; n = n->next, shown++)
            printf(" P%d", s->procs[n->idx].pid);
        if (cpu->count > shown) printf(" +%d", cpu->count - shown);
        if (cpu->count == 0) printf(" -");
        printf("   load=%ld\n", cpu_load(cpu, s->procs));
    }
    printf("\n(simulation running...)\n");
    fflush(stdout);
}

void viz_bars(const Sim *s, const Stats *st) {
    printf("\n  ---- Per-CPU utilization ----\n");
    for (int c = 0; c < s->ncpu; c++) {
        printf("  CPU%-2d ", c);
        bar(st->util[c], BAR_W);
        printf("   busy %ld / idle %ld ticks\n",
               s->cpus[c].busy_ticks, s->cpus[c].idle_ticks);
    }
    printf("\n  Load imbalance (max-min utilization): %.1f%%\n",
           st->imbalance * 100.0);
    printf("  0%% = perfectly balanced, larger = some CPUs idle while others queue up.\n");
}
