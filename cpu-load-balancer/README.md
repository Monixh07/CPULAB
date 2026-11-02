# CPU Load Balancing Simulator

OS mini-project demonstration: distribute processes among multiple simulated
CPUs using different load-balancing strategies, then compare the workloads
with real scheduling metrics.

Written in strict C99 — one `gcc` command builds it, no libraries to install.

## Features

- **3 load-balancing strategies** (static assignment at arrival time)
  - Round Robin — CPUs take turns: P1→CPU0, P2→CPU1, …
  - Least Loaded — each process goes to the CPU with the least remaining work
  - Random — uniform random assignment (the "why we need balancing" baseline)
- **Dynamic migration engine** — every N ticks, the biggest waiting job moves
  from the most-loaded CPU to the least-loaded one (toggleable, threshold-based;
  the running process is never migrated)
- **Per-CPU schedulers** — each simulated CPU runs its own ready queue with
  FCFS, SJF (non-preemptive), or Round Robin with configurable quantum —
  the same programs from the OS lab, plugged into every CPU
- **Animated dashboard** — live per-CPU load bars, running process, queue
  contents, updated every tick
- **Full metrics** — per-process waiting / turnaround time, per-CPU
  utilization, makespan, and a load-imbalance score
- **Compare mode** — runs the *same* workload under all 3 strategies and
  prints a verdict table
- Workload input: random generator (seeded), text file, or manual entry;
  workloads can be saved/loaded for reproducible demos
- **Browser scheduling lab** — editable process table and six real algorithms:
  FCFS, SJF, SRTF, Priority, Round Robin, and HRRN
- **Multicore browser dashboard** — least-loaded, Round Robin, or random
  arrival assignment; optional safe migration of waiting processes; live CPU
  queues, Gantt timelines, measured algorithm comparison, and recommendations

## Project structure

```
cpu-load-balancer/
├── src/
│   ├── main.c        menu driver + input handling (+ `--auto` mode)
│   ├── process.h/.c  process struct, workload generator, file load/save
│   ├── cpu.h/.c      simulated CPU: ready queue, FCFS/SJF/RR scheduling
│   ├── balancer.h/.c load-balancing strategies + migration engine
│   ├── sim.h/.c      discrete-tick simulation engine
│   ├── stats.h/.c    metrics + strategy comparison
│   ├── viz.h/.c      text dashboard + utilization bars
│   └── platform.h/.c Windows/POSIX helpers (sleep, clear screen)
├── web/
│   ├── index.html    browser dashboard
│   ├── styles.css    responsive visual design
│   ├── app.js        workload editor, controls, and results
│   ├── simulator.js  scheduling engine, load assignment, metrics, recommendation
│   ├── tests.html    dependency-free scheduler test runner
│   └── simulator.test.js
├── sample_workload.txt   ready-made demo workload (16 processes)
├── Makefile              build on Linux/macOS
├── build.bat             build on Windows (MinGW gcc)
├── .vscode/tasks.json    Ctrl+Shift+B build task for VS Code
└── README.md             build instructions and project overview
```

## Requirements

- A C compiler: `gcc` (MinGW-w64 on Windows, preinstalled on Linux/macOS)
- That's it. No external libraries.

## Build & run in VS Code

1. **Install gcc** (once):
   - Windows: install MinGW-w64, tick "Add to PATH", then check with
     `gcc --version` in a terminal
   - Linux: `sudo apt install build-essential` · macOS: `xcode-select --install`
2. **Open this folder** in VS Code (`File → Open Folder…`)
3. **Build**: open a terminal in VS Code (`` Ctrl+` ``) and run
   - Windows: `build.bat`
   - Linux/macOS: `make`
   
   (or press `Ctrl+Shift+B` — the gcc build task is preconfigured)
4. **Run**:
   - Windows: `.\cpulb.exe`
   - Linux/macOS: `./cpulb`

Non-interactive comparison (no menu): `./cpulb --auto`

## Browser front end

Open `web/index.html` in a browser. The browser simulator runs locally with no
server, compiler, or external dependencies; it does not replace the C command-
line application.

1. Edit process IDs, arrival times, burst times, and priorities; or load the
   sample workload, add a process, or generate a random workload.
2. Select the CPU count, scheduling algorithm, and CPU assignment strategy.
   Configure the Round Robin quantum or priority mode when applicable.
3. Choose an optimization objective and select **Run simulation** to watch the
   live CPU states. Pause, resume, advance one tick at a time, or reset the run.
4. Choose **Compare algorithms** to run FCFS, SJF, SRTF, Priority, Round Robin,
   and HRRN independently against the same workload. Sort the measured results
   and inspect the Gantt charts, process timings, and workload-specific
   recommendation.

### Browser scheduling model

The browser simulator separates process assignment from CPU scheduling. At
arrival, the load balancer assigns each process to a CPU-specific ready queue;
that CPU's scheduler then chooses which of its local ready processes runs.
FCFS, SJF, HRRN, and non-preemptive Priority finish the selected process
without interruption. SRTF and preemptive Priority reconsider the running
process against that CPU's ready queue each tick. Round Robin uses an
independent FIFO queue and quantum on each CPU; new arrivals are enqueued
before work whose quantum has just expired. Priority 1 is higher than
priority 2. Equal choices break ties by arrival time, then process ID.
Least Loaded assigns to the CPU with the least total remaining running and
queued work; Round Robin rotates CPU assignments; Random uses a repeatable
seed during comparisons. Optional dynamic migration moves the largest waiting
process from the most-loaded CPU to the least-loaded CPU every 15 ticks when
their estimated-workload gap exceeds 8 ticks. A running process is never
migrated.

### Browser metrics and recommendation

- Turnaround = completion time − arrival time.
- Waiting = turnaround − burst time; the engine also tracks time spent ready,
  including time between preemptions.
- Response = first CPU start − arrival time.
- Throughput = completed processes ÷ makespan, where the clock starts at tick
  0 (so initial CPU idle time is included).
- Per-CPU utilization = busy ticks ÷ makespan. Average utilization is the
  average of these values; aggregate utilization divides total busy ticks by
  total available CPU ticks.
- Load imbalance = highest per-CPU utilization − lowest per-CPU utilization.
- Context switches count transitions between different processes on the same
  CPU. Migrations count a process resuming on a different CPU.

Every algorithm receives a fresh copy of the input workload. The recommender
optimizes the selected measured metric and reports exact ties. Balanced
performance uses an equal-weight average of six min-max-normalized scores:
waiting, turnaround, response, and load imbalance (lower is better), plus
throughput and CPU utilization (higher is better). Recommendations describe
the result for this workload; they do not imply one algorithm is best in
general.

To run the dependency-free automated browser tests, open `web/tests.html`. The
page checks algorithm timelines, multicore execution, metric formulas,
recommendation ties, and input validation, and reports a pass/fail summary.

### Project overview

- **Problem:** jobs need CPU time; the scheduling algorithm selects which
  ready process runs, and the load-balancing policy chooses an available core.
- **Objective:** make both decisions observable and compare their measured
  effects on response, waiting, throughput, utilization, and balance.
- **Technology:** strict C99 for the original terminal simulator; plain
  HTML/CSS/JavaScript for the browser simulator; no frontend framework or
  package dependencies.
- **Limitations:** both simulators use a discrete tick model with CPU-bound
  processes. The browser model does not model I/O, context-switch cost, or
  backward stepping. The C program remains a separate simulator with
  per-CPU FCFS/SJF/RR queues and its own arrival-assignment/migration policies;
  results from the two models are not interchangeable.

## Demo in 60 seconds

1. Run the program, choose **2** → `sample_workload.txt`
2. Choose **9** (Compare all strategies):

```
  +----------------+----------+----------+----------+-----------+----------+
  | Strategy       | Avg wait | Avg TAT  | Makespan | Imbalance | Min util |
  +----------------+----------+----------+----------+-----------+----------+
  | Round Robin    |    14.56 |    23.94 |       45 |      33.3% |    66.7% |
  | Least Loaded   |    13.94 |    23.31 |       41 |      19.5% |    80.5% |
  | Random         |    20.62 |    30.00 |       69 |      65.2% |    34.8% |
  +----------------+----------+----------+----------+-----------+----------+
```

3. Choose **7** (animated run) to watch the CPUs work live.
4. Explain the result using the strategies section below.

## The strategies, briefly

| Strategy | How it assigns | Strength | Weakness |
|---|---|---|---|
| Round Robin | cycles CPUs in order | simple, starvation-free | blind to actual load — a CPU can idle while another queues |
| Least Loaded | picks CPU with min remaining work | best balance & lowest wait | needs load info (slight overhead) |
| Random | uniform random | zero bookkeeping | can pile everything on one CPU |

**Migration** fixes imbalance *during* the run: when the gap between the
most- and least-loaded CPU exceeds a threshold, the largest waiting job moves
over. Try the comparison with migration ON vs OFF (menu 6 → 5) — Random
improves dramatically, which is exactly the point of dynamic load balancing.

## Terminal simulator metrics

- **Waiting time** = turnaround − burst (time spent in ready queues)
- **Turnaround time** = completion − arrival
- **CPU utilization** = busy ticks ÷ total ticks
- **Makespan** = ticks until the last process finishes
- **Imbalance** = max CPU utilization − min CPU utilization (0% = perfect)

## Viva Q&A (likely questions)

1. **What is load balancing?** Distributing work across processors so no CPU
   is overloaded while others sit idle — maximizes throughput and minimizes
   response time.
2. **Static vs dynamic?** The terminal simulator assigns processes at arrival
   and can migrate waiting work. The browser simulator assigns each arrival to
   a per-CPU ready queue and can migrate eligible waiting processes later.
3. **Why does Least Loaded beat Round Robin?** RR only counts *processes*,
   not *work* — three tiny jobs vs one huge job look identical to it.
   Least Loaded measures remaining burst time, so heavy jobs spread out.
4. **What is starvation, and does it occur here?** A process waiting
   indefinitely. SJF can starve long jobs in theory; RR never starves
   (everyone gets a quantum); migration only moves *waiting* jobs, so the
   running process is never preempted by the balancer.
5. **Why not migrate the running process?** That needs a context switch —
   saving registers/state — which costs more than it saves for a simulator;
   real systems (e.g. Linux CFS load_balance) do migrate, but with cost checks.
6. **What does the quantum do in RR?** Smaller quantum = fairer/faster
   response but more context switches; larger = closer to FCFS. Try 1 vs 20
   in the config menu and watch avg waiting time change.
7. **Where is this used in real OSes?** Linux CFS periodically rebalances
   runqueues across cores; cloud schedulers (Kubernetes) place pods on the
   least-loaded node — same idea as STRAT_LEAST.
8. **Limitations of this simulator?** Discrete CPU ticks, no I/O bursts, no
   context-switch cost, and no backward Gantt-chart stepping.

### Browser scheduling viva

- **What is scheduling versus load balancing?** Scheduling selects ready
  processes; load balancing selects which available CPU runs them.
- **What does SRTF add to SJF?** It may preempt a running job when a process
  with less remaining work arrives.
- **How is HRRN calculated?** `(waiting time + burst time) / burst time`;
  choosing the largest response ratio favors processes that have waited.
- **Which priority number wins?** The smaller number; ties use arrival time,
  then process ID.
- **Does the recommender pick a universally best algorithm?** No. It ranks
  measured results for this workload and the selected optimization goal.
- **What is the browser multicore policy?** Each CPU has its own ready queue.
  The load balancer assigns processes at arrival, then that CPU's scheduler
  chooses its next process. SRTF operates on each CPU's local queue.

## Possible extensions

- I/O-bound processes · migration/context-switch cost models · Gantt chart
  export · workload import/export in the browser
