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
- **Browser scheduling lab** — editable process table and four real algorithms:
  FCFS, SJF, Priority, and Round Robin
- **Multicore browser dashboard** — least-loaded, Round Robin, or random
  arrival assignment; optional safe migration of waiting processes; live CPU
  queues, Gantt timelines, measured algorithm comparison, and recommendations
  (some advanced controls are hidden in the current page layout)

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

## Source file guide

| File | Purpose and how it fits |
|---|---|
| `src/main.c` | Starts the terminal program and routes menu input. `main` and `auto_mode` choose interactive or fixed-workload execution; `generate_menu`, `manual_menu`, and the file actions prepare workloads; `run_simulation` runs and reports one simulation. |
| `src/process.h` | Defines `Process`, the maximum workload size, and the workload function declarations. |
| `src/process.c` | `process_reset` restores a process; `generate_workload`, `load_workload`, and `save_workload` create or transfer workload data; `print_workload` displays it. |
| `src/cpu.h` | Defines `CPU`, ready-queue nodes, scheduler options, counters, and CPU function declarations. |
| `src/cpu.c` | `cpu_init`/`cpu_cleanup` manage CPU state; `cpu_enqueue`/`cpu_dequeue` manage the queue; `cpu_dequeue_min` supports SJF; `cpu_steal_largest` selects migration work; `cpu_load` totals remaining work. |
| `src/balancer.h` | Declares the assignment strategies and migration functions. |
| `src/balancer.c` | `balancer_assign` chooses a CPU for arrivals; `balancer_migrate` moves one large waiting process from the busiest CPU to the least-loaded CPU when the threshold is exceeded. |
| `src/sim.h` | Defines `Sim` and declares `sim_defaults`, `sim_setup`, `sim_run`, and `sim_cleanup`. |
| `src/sim.c` | `sim_run` advances one tick at a time: assign arrivals, optionally migrate work, schedule each CPU, and record execution and completion. The other `sim_*` functions initialize or release run state. |
| `src/stats.h` | Defines `Stats` and declares metric calculation and comparison functions. |
| `src/stats.c` | `stats_compute` calculates timing and utilization metrics; `stats_print` displays them; `compare_strategies` runs each assignment policy against a copy of the same workload. |
| `src/viz.h` | Declares the terminal dashboard and utilization display. |
| `src/viz.c` | `viz_dashboard` displays live CPU state; `viz_bars` prints final utilization; the private `bar` helper draws each bar. |
| `src/platform.h` | Declares `msleep` and `clear_screen`, the platform-specific terminal helpers. |
| `src/platform.c` | Implements `msleep` and `clear_screen` for Windows and POSIX systems. |
| `web/index.html` | Provides the browser interface elements and loads the stylesheet and JavaScript. |
| `web/styles.css` | Styles the browser controls, CPU cards, workload/results tables, and timeline; its final rules hide several advanced controls/results. |
| `web/app.js` | `renderWorkload`/`readWorkload` handle process inputs; `startSimulation`/`advanceOneTick` drive the animation; rendering functions display CPU state and results; `compareAlgorithms` prepares comparisons (its control is currently hidden). |
| `web/simulator.js` | `validateInput` checks settings; `create` initializes state; `step` advances one tick; `run` completes a simulation; `metrics` calculates results; `recommend` ranks results. |
| `web/simulator.test.js` | Contains browser tests for algorithm timelines, metrics, multicore execution, migration, and recommendations. |
| `web/tests.html` | Loads the browser simulator tests and displays their pass/fail results. |
| `sample_workload.txt` | Small text workload that can be loaded by the terminal program for a repeatable demonstration. |
| `Makefile` | Builds the C program with GCC on Linux or macOS and provides the clean target. |
| `build.bat` | Builds the same C sources with GCC on Windows. |
| `.vscode/tasks.json` | Adds the GCC build command to VS Code's build-task menu. |
| `README.md` | Documents setup, controls, algorithms, metrics, and the demonstration workflow. |

## Application workflow

### Terminal simulator

1. The program starts in `src/main.c`. It sets default CPU, scheduler, and
   load-balancer settings, then shows the menu. `--auto` skips the menu and
   compares a fixed, seeded workload.
2. The user generates processes, loads `sample_workload.txt` (or another
   workload file), or enters process details manually. Each process has an
   arrival time, CPU burst length, and priority.
3. Before a run, `sim_setup` initializes the CPUs and resets each process.
   `sim_run` advances the clock in ticks. At each tick it assigns arrivals
   using `balancer_assign`, may migrate waiting work, and lets each CPU's
   FCFS, SJF, or Round Robin scheduler select and execute a process.
4. The running process's remaining burst decreases by one. The simulator
   counts busy and idle ticks and records when each process completes. In
   animated mode, `viz_dashboard` displays the CPU states after each tick.
5. Afterward, `stats_compute` calculates average waiting and turnaround
   times, makespan, CPU utilization, and utilization imbalance.
   `stats_print` displays per-process results and `viz_bars` shows utilization.
   Compare mode repeats the run for each load-balancing strategy using the
   same original workload and configuration.

### Browser simulator

1. Open `web/index.html` directly in a browser. It loads `styles.css`,
   `simulator.js`, and `app.js`; no server or package installation is needed.
2. `app.js` fills the editable workload table and reads the visible CPU-count
   and scheduling-algorithm controls. `simulator.js` validates the input and
   creates fresh process and CPU state.
3. Each simulation step processes arrivals, assigns each one to a CPU,
   optionally migrates eligible waiting work, then runs the selected scheduler
   on every CPU. The page repeats these steps at the selected speed.
4. `app.js` renders CPU queues and running processes during the run. The
   engine also calculates metrics and can provide process timings, execution
   histories, Gantt charts, and comparisons, but those extended results and
   controls are hidden from the current page interface.

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
line application. The current page shows a streamlined set of controls:
assignment, migration, comparison, and step/pause controls are implemented,
but their corresponding UI elements are hidden in the HTML/CSS.

1. Expand **Workload** to edit process IDs, arrival times, burst times, and
   priorities, or add a process. The sample and random-generation controls are
   present in the page but hidden by the current stylesheet.
2. Select the CPU count and one of the four scheduling algorithms.
3. Select **Run simulation** to watch the CPU cards update. When the run
   finishes, the page displays the completion time and process count.
4. The engine and page-rendering code also implement richer metrics, Gantt
   charts, and algorithm comparisons; these results and their controls are
   currently hidden from the normal page interface.

### Browser scheduling model

The browser simulator separates process assignment from CPU scheduling. At
arrival, the load balancer assigns each process to a CPU-specific ready queue;
that CPU's scheduler then chooses which of its local ready processes runs.
FCFS, SJF, and non-preemptive Priority finish the selected process without
interruption. Preemptive Priority reconsiders the running process against that
CPU's ready queue each tick. Round Robin uses an independent FIFO queue and
quantum on each CPU; new arrivals are enqueued before work whose quantum has
just expired. Priority 1 is higher than priority 2. Equal choices break ties
by arrival time, then process ID.
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
  | Round Robin    |    13.56 |    22.94 |       44 |      31.8% |    68.2% |
  | Least Loaded   |    13.94 |    23.31 |       41 |      19.5% |    80.5% |
  | Random         |    18.00 |    27.38 |       46 |      45.7% |    54.3% |
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
- **Which priority number wins?** The smaller number; ties use arrival time,
  then process ID.
- **Does the recommender pick a universally best algorithm?** No. It ranks
  measured results for this workload and the selected optimization goal.
- **What is the browser multicore policy?** Each CPU has its own ready queue.
  The load balancer assigns processes at arrival, then that CPU's scheduler
  chooses its next process. Preemptive Priority operates on each CPU's local
  queue.

## Possible extensions

- I/O-bound processes · migration/context-switch cost models · Gantt chart
  export · workload import/export in the browser
