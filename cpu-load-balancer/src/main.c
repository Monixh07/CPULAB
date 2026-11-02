/*
 * main.c - menu driver for the CPU Load Balancing Simulator.
 *
 * Usage:
 *   ./cpulb            interactive menu (the demo mode)
 *   ./cpulb --auto     non-interactive: fixed workload + strategy comparison
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "sim.h"
#include "stats.h"
#include "viz.h"
#include "platform.h"

/* Read an integer in [lo, hi]. Reprompts until valid. Exits on EOF. */
static int read_int(const char *prompt, int lo, int hi) {
    char line[256];
    for (;;) {
        printf("%s", prompt);
        fflush(stdout);
        if (!fgets(line, sizeof line, stdin)) {
            printf("\nEOF - exiting.\n");
            exit(0);
        }
        int v;
        if (sscanf(line, "%d", &v) == 1 && v >= lo && v <= hi)
            return v;
        printf("  Please enter a number between %d and %d.\n", lo, hi);
    }
}

/* Read a single word (no spaces). Exits on EOF. */
static void read_word(const char *prompt, char *buf, size_t n) {
    printf("%s", prompt);
    fflush(stdout);
    if (scanf("%255s", buf) != 1) {
        printf("\nEOF - exiting.\n");
        exit(0);
    }
    int ch;
    while ((ch = getchar()) != '\n' && ch != EOF) { /* discard rest of line */ }
    (void)n;
}

static void pause_enter(void) {
    printf("\n  Press Enter to continue...");
    fflush(stdout);
    int ch;
    while ((ch = getchar()) != '\n' && ch != EOF) { }
}

static void show_config(const Sim *s) {
    printf("\n  ---- Current configuration ----\n");
    printf("  CPUs                  : %d\n", s->ncpu);
    printf("  Load-balancing strategy: %s\n", strat_name(s->strategy));
    printf("  Per-CPU scheduler     : %s\n", sched_name(s->scheduler));
    printf("  RR time quantum       : %d ticks\n", s->quantum);
    printf("  Migration             : %s", s->migration ? "ON" : "OFF");
    if (s->migration)
        printf(" (every %d ticks, threshold %d)", s->migrate_interval,
               s->migrate_threshold);
    printf("\n");
    printf("  Live animation        : %s (%d ms/tick)\n",
           s->live ? "ON" : "OFF", s->delay_ms);
    printf("  Workload              : %d processes\n", s->nprocs);
}

static void config_menu(Sim *s) {
    for (;;) {
        show_config(s);
        printf("\n  1. Number of CPUs (1-%d)\n", MAXCPU);
        printf("  2. Load-balancing strategy\n");
        printf("  3. Per-CPU scheduler\n");
        printf("  4. RR time quantum\n");
        printf("  5. Toggle migration\n");
        printf("  6. Migration interval / threshold\n");
        printf("  7. Toggle live animation\n");
        printf("  8. Animation speed (ms per tick)\n");
        printf("  0. Back\n");
        int c = read_int("  Choice: ", 0, 8);
        if (c == 0) return;
        switch (c) {
            case 1: s->ncpu = read_int("  CPUs (1-16): ", 1, MAXCPU); break;
            case 2:
                printf("  0=Round Robin  1=Least Loaded  2=Random\n");
                s->strategy = read_int("  Strategy: ", 0, 2);
                break;
            case 3:
                printf("  0=FCFS  1=SJF  2=Round Robin\n");
                s->scheduler = read_int("  Scheduler: ", 0, 2);
                break;
            case 4: s->quantum = read_int("  Quantum (1-50 ticks): ", 1, 50); break;
            case 5: s->migration = !s->migration;
                    printf("  Migration %s.\n", s->migration ? "ON" : "OFF");
                    break;
            case 6:
                s->migrate_interval = read_int("  Every N ticks (1-200): ", 1, 200);
                s->migrate_threshold = read_int("  Load-gap threshold (1-100): ", 1, 100);
                break;
            case 7: s->live = !s->live;
                    printf("  Live animation %s.\n", s->live ? "ON" : "OFF");
                    break;
            case 8: s->delay_ms = read_int("  ms per tick (0-1000): ", 0, 1000); break;
        }
    }
}

static void generate_menu(Sim *s) {
    int n = read_int("  Number of processes (1-500): ", 1, MAXPROC);
    int ma = read_int("  Max arrival time (0-200): ", 0, 200);
    int mb = read_int("  Max burst time (1-100): ", 1, 100);
    unsigned seed = (unsigned)read_int("  Random seed (0 = use current time): ",
                                       0, 1000000000);
    if (seed == 0) seed = (unsigned)time(NULL);
    s->nprocs = generate_workload(s->procs, n, ma, mb, seed);
    printf("  Generated %d processes (seed %u).\n", s->nprocs, seed);
}

static void manual_menu(Sim *s) {
    int n = read_int("  Number of processes (1-50): ", 1, 50);
    for (int i = 0; i < n; i++) {
        printf("  Process P%d:\n", i + 1);
        s->procs[i].pid = i + 1;
        s->procs[i].arrival = read_int("    arrival time: ", 0, 10000);
        s->procs[i].burst = read_int("    burst time: ", 1, 10000);
        s->procs[i].priority = read_int("    priority (1-5): ", 1, 5);
        process_reset(&s->procs[i]);
    }
    s->nprocs = n;
    printf("  Recorded %d processes.\n", n);
}

static void run_simulation(Sim *s, int live) {
    if (s->nprocs == 0) {
        printf("  No workload yet - generating a default one (20 processes).\n");
        s->nprocs = generate_workload(s->procs, 20, 10, 20,
                                      (unsigned)time(NULL));
    }
    int old_live = s->live;
    s->live = live;
    srand((unsigned)time(NULL));

    sim_setup(s);
    int makespan = sim_run(s);

    Stats st;
    stats_compute(s, &st);
    if (live) {
        /* leave the last dashboard frame up, then show results below */
        printf("\n");
    }
    printf("\n==== Simulation finished: makespan %d ticks ====", makespan);
    printf("\n  Strategy: %s | Scheduler: %s | Migration: %s\n",
           strat_name(s->strategy), sched_name(s->scheduler),
           s->migration ? "ON" : "OFF");
    stats_print(s, &st);
    sim_cleanup(s);
    s->live = old_live;
}

/* Non-interactive mode: fixed workload, compare all strategies, exit. */
static int auto_mode(void) {
    Sim base;
    sim_defaults(&base);
    base.ncpu = 4;
    base.scheduler = SCHED_RR;
    base.quantum = 4;
    base.migration = 1;
    base.nprocs = generate_workload(base.procs, 24, 12, 24, 42);

    printf("CPU Load Balancing Simulator -- auto comparison\n");
    printf("Workload: 24 processes (seed 42), 4 CPUs, RR scheduler q=4, migration ON\n");
    compare_strategies(&base);
    return 0;
}

int main(int argc, char **argv) {
    if (argc > 1 && strcmp(argv[1], "--auto") == 0)
        return auto_mode();

    Sim s;
    sim_defaults(&s);

    printf("===============================================\n");
    printf("   CPU Load Balancing Simulator (OS mini project)\n");
    printf("===============================================\n");

    for (;;) {
        printf("\n  ---- Main menu ----\n");
        printf("  1. Generate random workload\n");
        printf("  2. Load workload from file\n");
        printf("  3. Enter processes manually\n");
        printf("  4. Save current workload to file\n");
        printf("  5. Show current workload\n");
        printf("  6. Configure simulation\n");
        printf("  7. Run simulation (animated)\n");
        printf("  8. Run simulation (fast)\n");
        printf("  9. Compare all strategies\n");
        printf("  0. Exit\n");

        int c = read_int("  Choice: ", 0, 9);
        char path[256];

        switch (c) {
            case 0:
                printf("  Bye!\n");
                return 0;
            case 1: generate_menu(&s); break;
            case 2:
                read_word("  File path: ", path, sizeof path);
                {
                    int n = load_workload(path, s.procs, MAXPROC);
                    if (n < 0) printf("  Could not load '%s'.\n", path);
                    else { s.nprocs = n; printf("  Loaded %d processes.\n", n); }
                }
                break;
            case 3: manual_menu(&s); break;
            case 4:
                if (s.nprocs == 0) { printf("  No workload to save.\n"); break; }
                read_word("  File path: ", path, sizeof path);
                if (save_workload(path, s.procs, s.nprocs) == 0)
                    printf("  Saved %d processes to '%s'.\n", s.nprocs, path);
                else
                    printf("  Could not write '%s'.\n", path);
                break;
            case 5:
                if (s.nprocs == 0) printf("  No workload yet.\n");
                else print_workload(s.procs, s.nprocs);
                break;
            case 6: config_menu(&s); break;
            case 7: run_simulation(&s, 1); pause_enter(); break;
            case 8: run_simulation(&s, 0); pause_enter(); break;
            case 9:
                if (s.nprocs == 0) {
                    printf("  No workload yet - generating a default one.\n");
                    s.nprocs = generate_workload(s.procs, 20, 10, 20,
                                                 (unsigned)time(NULL));
                }
                compare_strategies(&s);
                pause_enter();
                break;
        }
    }
}
