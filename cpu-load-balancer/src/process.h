/*
 * process.h - the "process" abstraction.
 *
 * A process is a unit of work that arrives at some time, needs `burst`
 * CPU ticks to finish, and then reports waiting time / turnaround time.
 */
#ifndef PROCESS_H
#define PROCESS_H

#define MAXPROC 500

typedef struct {
    int pid;             /* process id, 1-based for display */
    int arrival;         /* tick at which the process arrives */
    int burst;           /* total CPU ticks needed */
    int remaining;       /* ticks still needed (counts down) */
    int priority;        /* informational only (lower = more important) */
    int start_time;      /* first tick it ran on a CPU (-1 = never) */
    int completion_time; /* tick it finished (-1 = not finished) */
    int cpu_id;          /* CPU it is assigned to (-1 = unassigned) */
} Process;

/* Reset a process to its initial state before a simulation run. */
void process_reset(Process *p);

/* Fill `procs` with n random processes. Returns n. */
int generate_workload(Process *procs, int n,
                      int max_arrival, int max_burst, unsigned seed);

/* Load a workload from a text file. Format:
 *   <n>
 *   <arrival> <burst> <priority>      (one line per process)
 * Returns number of processes loaded, or -1 on error. */
int load_workload(const char *path, Process *procs, int maxn);

/* Save a workload to a text file. Returns 0 on success, -1 on error. */
int save_workload(const char *path, const Process *procs, int n);

/* Print the workload as a table. */
void print_workload(const Process *procs, int n);

#endif
