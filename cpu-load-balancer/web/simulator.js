'use strict';

(function exposeSimulator(root) {
  const ALGORITHMS = {
    fcfs: { name: 'FCFS', description: 'First Come, First Served runs the earliest arriving ready process to completion.' },
    sjf: { name: 'SJF', description: 'Shortest Job First chooses the ready process with the smallest burst, then runs it to completion.' },
    priority: { name: 'Priority', description: 'Priority scheduling chooses the smallest priority number first. You can choose preemptive or non-preemptive mode.' },
    rr: { name: 'Round Robin', description: 'Round Robin gives each ready process a turn of up to the selected time quantum.' }
  };

  const BALANCERS = {
    least: 'Least Loaded',
    roundRobin: 'Round Robin',
    random: 'Random'
  };

  const OBJECTIVES = {
    averageWaitingTime: 'min',
    averageTurnaroundTime: 'min',
    averageResponseTime: 'min',
    throughput: 'max',
    averageCpuUtilization: 'max',
    makespan: 'min'
  };

  function validateInput(input) {
    if (!input || !Array.isArray(input.processes) || input.processes.length === 0) {
      throw new Error('Add at least one process before running the simulation.');
    }
    if (input.processes.length > 500) throw new Error('A workload can contain at most 500 processes.');
    if (!Number.isInteger(input.cpuCount) || input.cpuCount < 1 || input.cpuCount > 16) {
      throw new Error('CPU count must be an integer from 1 to 16.');
    }
    let totalBurst = 0;
    let maximumArrival = 0;
    if (!Object.hasOwn(ALGORITHMS, input.algorithm)) {
      throw new Error('Choose a supported scheduling algorithm.');
    }
    if (!Object.hasOwn(BALANCERS, input.balancer)) {
      throw new Error('Choose a supported CPU assignment strategy.');
    }
    if (!Number.isSafeInteger(input.quantum) || input.quantum < 1) {
      throw new Error('Round Robin quantum must be a positive integer.');
    }
    if (input.migrationInterval !== undefined &&
        (!Number.isSafeInteger(input.migrationInterval) || input.migrationInterval < 1)) {
      throw new Error('Migration interval must be a positive integer.');
    }
    if (input.migrationThreshold !== undefined &&
        (!Number.isSafeInteger(input.migrationThreshold) || input.migrationThreshold < 0)) {
      throw new Error('Migration threshold must be a non-negative integer.');
    }
    const ids = new Set();
    for (const process of input.processes) {
      if (!process || (typeof process.pid !== 'number' && typeof process.pid !== 'string')) {
        throw new Error('Every process must have a process ID.');
      }
      const id = String(process.pid).trim();
      if (!id || ids.has(id)) throw new Error('Process IDs must be non-empty and unique.');
      ids.add(id);
      if (!Number.isSafeInteger(process.arrival) || process.arrival < 0) {
        throw new Error(`Process ${id} must have a non-negative integer arrival time.`);
      }
      if (!Number.isSafeInteger(process.burst) || process.burst < 1) {
        throw new Error(`Process ${id} must have a positive integer burst time.`);
      }
      if (!Number.isSafeInteger(process.priority) || process.priority < 1) {
        throw new Error(`Process ${id} must have a positive integer priority.`);
      }
      totalBurst += process.burst;
      maximumArrival = Math.max(maximumArrival, process.arrival);
    }
    if (maximumArrival + totalBurst > 10000 ||
        input.processes.length * (maximumArrival + totalBurst) > 10000000) {
      throw new Error('This workload is too large for a responsive browser simulation. Reduce the process count, arrival times, or burst times.');
    }
  }

  function create(input, seed) {
    validateInput(input);
    const rng = makeRandom(seed === undefined ? 42 : seed);
    const simulation = {
      config: {
        cpuCount: input.cpuCount,
        algorithm: input.algorithm,
        balancer: input.balancer,
        quantum: input.quantum,
        preemptivePriority: input.preemptivePriority !== false,
        migration: input.migration !== false,
        migrationInterval: input.migrationInterval || 15,
        migrationThreshold: input.migrationThreshold === undefined ? 8 : input.migrationThreshold
      },
      processes: input.processes.map(process => ({
        pid: String(process.pid).trim(),
        arrival: process.arrival,
        burst: process.burst,
        priority: process.priority,
        remaining: process.burst,
        startTime: null,
        completionTime: null,
        waitingTime: 0,
        lastCpu: null,
        cpuId: null,
        migrationHistory: [],
        executionHistory: []
      })),
      cpus: Array.from({ length: input.cpuCount }, (_, id) => ({
        id,
        queue: [],
        running: null,
        quantumLeft: 0,
        busyTicks: 0,
        idleTicks: 0,
        history: []
      })),
      time: 0,
      completed: 0,
      contextSwitches: 0,
      migrations: 0,
      assignmentCursor: 0,
      random: rng
    };
    simulation.processes.sort((a, b) => a.arrival - b.arrival || a.pid.localeCompare(b.pid, undefined, { numeric: true }));
    return simulation;
  }

  function makeRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function isPreemptive(simulation) {
    return simulation.config.algorithm === 'priority' && simulation.config.preemptivePriority;
  }

  function compareReady(simulation, left, right) {
    const { algorithm } = simulation.config;
    const p = simulation.processes[left];
    const q = simulation.processes[right];
    let order = 0;
    if (algorithm === 'sjf') order = p.burst - q.burst;
    else if (algorithm === 'priority') order = p.priority - q.priority;
    return order || p.arrival - q.arrival ||
      p.pid.localeCompare(q.pid, undefined, { numeric: true });
  }

  function cpuLoad(simulation, cpu) {
    let load = cpu.running === null ? 0 : simulation.processes[cpu.running].remaining;
    for (const index of cpu.queue) load += simulation.processes[index].remaining;
    return load;
  }

  function selectCpu(simulation) {
    if (simulation.config.balancer === 'roundRobin') {
      const cpuId = simulation.assignmentCursor % simulation.cpus.length;
      simulation.assignmentCursor++;
      return cpuId;
    }
    if (simulation.config.balancer === 'random') {
      return Math.floor(simulation.random() * simulation.cpus.length);
    }
    let selected = 0;
    for (let id = 1; id < simulation.cpus.length; id++) {
      if (cpuLoad(simulation, simulation.cpus[id]) < cpuLoad(simulation, simulation.cpus[selected])) {
        selected = id;
      }
    }
    return selected;
  }

  function dispatch(simulation, processIndex, cpuId) {
    const cpu = simulation.cpus[cpuId];
    const process = simulation.processes[processIndex];
    process.lastCpu = cpuId;
    if (process.startTime === null) process.startTime = simulation.time;
    if (cpu.history.length > 0) {
      const previous = cpu.history[cpu.history.length - 1];
      if (previous !== null && previous !== process.pid) simulation.contextSwitches++;
    }
    cpu.running = processIndex;
    cpu.quantumLeft = simulation.config.quantum;
  }

  function migrateOne(simulation) {
    if (!simulation.config.migration || simulation.cpus.length < 2) return false;
    let high = 0;
    let low = 0;
    for (let index = 1; index < simulation.cpus.length; index++) {
      if (cpuLoad(simulation, simulation.cpus[index]) > cpuLoad(simulation, simulation.cpus[high])) high = index;
      if (cpuLoad(simulation, simulation.cpus[index]) < cpuLoad(simulation, simulation.cpus[low])) low = index;
    }
    if (high === low ||
        cpuLoad(simulation, simulation.cpus[high]) - cpuLoad(simulation, simulation.cpus[low]) <=
          simulation.config.migrationThreshold) return false;

    const source = simulation.cpus[high].queue;
    if (source.length === 0) return false;
    let largest = 0;
    for (let index = 1; index < source.length; index++) {
      if (simulation.processes[source[index]].remaining > simulation.processes[source[largest]].remaining) {
        largest = index;
      }
    }
    const [processIndex] = source.splice(largest, 1);
    const process = simulation.processes[processIndex];
    simulation.cpus[low].queue.push(processIndex);
    process.cpuId = low;
    process.migrationHistory.push({ time: simulation.time, from: high, to: low });
    simulation.migrations++;
    return true;
  }

  function scheduleCpu(simulation, cpu) {
    if (simulation.config.algorithm === 'rr' && cpu.running !== null && cpu.quantumLeft === 0) {
      cpu.queue.push(cpu.running);
      cpu.running = null;
    }

    if (isPreemptive(simulation)) {
      const candidates = cpu.queue.concat(cpu.running === null ? [] : [cpu.running]);
      if (candidates.length === 0) return;
      candidates.sort((a, b) => compareReady(simulation, a, b));
      const next = candidates[0];
      if (next === cpu.running) return;
      if (cpu.running !== null) cpu.queue.push(cpu.running);
      cpu.queue.splice(cpu.queue.indexOf(next), 1);
      dispatch(simulation, next, cpu.id);
      return;
    }

    if (cpu.running !== null || cpu.queue.length === 0) return;
    if (simulation.config.algorithm !== 'fcfs' && simulation.config.algorithm !== 'rr') {
      cpu.queue.sort((a, b) => compareReady(simulation, a, b));
    }
    dispatch(simulation, cpu.queue.shift(), cpu.id);
  }

  function step(simulation) {
    if (simulation.completed === simulation.processes.length) return false;
    for (let index = 0; index < simulation.processes.length; index++) {
      const process = simulation.processes[index];
      if (process.arrival === simulation.time && process.cpuId === null) {
        const cpuId = selectCpu(simulation);
        process.cpuId = cpuId;
        simulation.cpus[cpuId].queue.push(index);
      }
    }
    if (simulation.time > 0 && simulation.time % simulation.config.migrationInterval === 0) {
      migrateOne(simulation);
    }
    for (const cpu of simulation.cpus) {
      scheduleCpu(simulation, cpu);
    }

    const running = new Set(simulation.cpus.map(cpu => cpu.running).filter(index => index !== null));
    for (let index = 0; index < simulation.processes.length; index++) {
      const process = simulation.processes[index];
      if (process.arrival <= simulation.time && process.completionTime === null &&
          !running.has(index) && process.remaining > 0) process.waitingTime++;
    }

    for (const cpu of simulation.cpus) {
      if (cpu.running === null) {
        cpu.idleTicks++;
        cpu.history.push(null);
        continue;
      }
      const process = simulation.processes[cpu.running];
      process.remaining--;
      cpu.busyTicks++;
      cpu.history.push(process.pid);
      process.executionHistory.push({ cpu: cpu.id, start: simulation.time, end: simulation.time + 1 });
      if (simulation.config.algorithm === 'rr') cpu.quantumLeft--;
      if (process.remaining === 0) {
        process.completionTime = simulation.time + 1;
        simulation.completed++;
        cpu.running = null;
      }
    }
    simulation.time++;
    return true;
  }

  function metrics(simulation) {
    if (simulation.completed !== simulation.processes.length) {
      throw new Error('Metrics are only available after every process has completed.');
    }
    const count = simulation.processes.length;
    const perCpuUtilization = simulation.cpus.map(cpu =>
      simulation.time ? cpu.busyTicks / simulation.time : 0
    );
    const waiting = simulation.processes.map(process =>
      process.completionTime - process.arrival - process.burst
    );
    const turnaround = simulation.processes.map(process =>
      process.completionTime - process.arrival
    );
    const response = simulation.processes.map(process =>
      process.startTime - process.arrival
    );
    const mean = values => values.reduce((total, value) => total + value, 0) / count;
    const minimumUtilization = Math.min(...perCpuUtilization);
    const maximumUtilization = Math.max(...perCpuUtilization);
    const totalBusy = simulation.cpus.reduce((total, cpu) => total + cpu.busyTicks, 0);
    return {
      averageWaitingTime: mean(waiting),
      averageTurnaroundTime: mean(turnaround),
      averageResponseTime: mean(response),
      throughput: simulation.time ? count / simulation.time : 0,
      averageCpuUtilization: perCpuUtilization.reduce((total, value) => total + value, 0) / perCpuUtilization.length,
      aggregateCpuUtilization: simulation.time ? totalBusy / (simulation.cpus.length * simulation.time) : 0,
      totalCpuBusyTime: totalBusy,
      totalCpuIdleTime: simulation.cpus.reduce((total, cpu) => total + cpu.idleTicks, 0),
      perCpuUtilization,
      makespan: simulation.time,
      loadImbalance: maximumUtilization - minimumUtilization,
      contextSwitches: simulation.contextSwitches,
      migrations: simulation.migrations,
      completedProcesses: count
    };
  }

  function run(input, seed) {
    const simulation = create(input, seed);
    while (step(simulation)) { /* advance one tick at a time */ }
    return { simulation, metrics: metrics(simulation) };
  }

  function recommend(results, objective) {
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('At least one completed result is required to make a recommendation.');
    }
    if (objective === 'balanced') {
      const balancedMetrics = [
        ['averageWaitingTime', 'min'],
        ['averageTurnaroundTime', 'min'],
        ['averageResponseTime', 'min'],
        ['throughput', 'max'],
        ['averageCpuUtilization', 'max'],
        ['loadImbalance', 'min']
      ];
      const scores = results.map(row => {
        let score = 0;
        for (const [key, direction] of balancedMetrics) {
          const values = results.map(result => result.metrics[key]);
          const minimum = Math.min(...values);
          const maximum = Math.max(...values);
          const span = maximum - minimum;
          score += (span === 0 ? 1 :
            (direction === 'min'
              ? (maximum - row.metrics[key]) / span
              : (row.metrics[key] - minimum) / span)) / balancedMetrics.length;
        }
        return { row, value: score };
      });
      const best = Math.max(...scores.map(item => item.value));
      return {
        winners: scores.filter(item => Math.abs(item.value - best) < 1e-10).map(item => item.row),
        value: best,
        direction: 'max',
        metric: 'balanced',
        scores
      };
    }
    const direction = OBJECTIVES[objective];
    if (!direction) throw new Error('Choose a supported optimization objective.');
    const best = results.reduce((selected, row) => {
      const value = row.metrics[objective];
      return direction === 'min'
        ? (value < selected.value ? { value, row } : selected)
        : (value > selected.value ? { value, row } : selected);
    }, { value: results[0].metrics[objective], row: results[0] });
    const winners = results.filter(row => Math.abs(row.metrics[objective] - best.value) < 1e-10);
    const scores = results.map(row => ({ row, value: row.metrics[objective] }));
    return { winners, value: best.value, direction, metric: objective, scores };
  }

  root.CPULabSimulator = Object.freeze({
    algorithms: Object.freeze(ALGORITHMS),
    balancers: Object.freeze(BALANCERS),
    validateInput,
    create,
    step,
    run,
    metrics,
    recommend,
    cpuLoad
  });
})(globalThis);
