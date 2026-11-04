'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const simulator = globalThis.CPULabSimulator;
  const results = document.querySelector('#test-results');
  const summary = document.querySelector('#test-summary');
  const failures = [];
  let passed = 0;

  function assert(name, condition, actual) {
    const item = document.createElement('li');
    item.textContent = `${condition ? 'PASS' : 'FAIL'} ${name}${condition ? '' : ` — ${JSON.stringify(actual)}`}`;
    results.append(item);
    if (condition) passed++;
    else failures.push(name);
  }

  function run(algorithm, processes, config = {}) {
    return simulator.run({
      processes,
      cpuCount: 1,
      algorithm,
      balancer: 'least',
      quantum: 2,
      ...config
    });
  }

  const fcfs = run('fcfs', [
    { pid: '1', arrival: 0, burst: 4, priority: 1 },
    { pid: '2', arrival: 1, burst: 2, priority: 2 }
  ]);
  assert('FCFS follows arrival order', fcfs.simulation.cpus[0].history.join() === '1,1,1,1,2,2');
  assert('Waiting time is turnaround minus burst', fcfs.metrics.averageWaitingTime === 1.5, fcfs.metrics.averageWaitingTime);
  assert('Turnaround time is completion minus arrival', fcfs.metrics.averageTurnaroundTime === 4.5, fcfs.metrics.averageTurnaroundTime);
  assert('Response time uses first CPU start', fcfs.metrics.averageResponseTime === 1.5, fcfs.metrics.averageResponseTime);

  const sjf = run('sjf', [
    { pid: '1', arrival: 0, burst: 8, priority: 1 },
    { pid: '2', arrival: 1, burst: 2, priority: 1 },
    { pid: '3', arrival: 1, burst: 1, priority: 1 }
  ]);
  assert('SJF is non-preemptive and chooses shortest available job', sjf.simulation.processes.map(p => p.completionTime).join() === '8,11,9');

  assert('Only syllabus scheduling algorithms are available',
    Object.keys(simulator.algorithms).join() === 'fcfs,sjf,priority,rr');

  const priority = run('priority', [
    { pid: '1', arrival: 0, burst: 4, priority: 3 },
    { pid: '2', arrival: 1, burst: 2, priority: 1 }
  ]);
  assert('Preemptive priority prefers the smaller priority number', priority.simulation.cpus[0].history.slice(0, 4).join() === '1,2,2,1');
  const nonpreemptivePriority = run('priority', [
    { pid: '1', arrival: 0, burst: 4, priority: 3 },
    { pid: '2', arrival: 1, burst: 2, priority: 1 }
  ], { preemptivePriority: false });
  assert('Non-preemptive priority completes its running process', nonpreemptivePriority.simulation.cpus[0].history.join() === '1,1,1,1,2,2');

  const roundRobin = run('rr', [
    { pid: '1', arrival: 0, burst: 5, priority: 1 },
    { pid: '2', arrival: 1, burst: 2, priority: 1 }
  ]);
  assert('Round Robin requeues expired work behind new arrivals', roundRobin.simulation.cpus[0].history.join() === '1,1,2,2,1,1,1');
  assert('Round Robin context switches count process changes', roundRobin.metrics.contextSwitches === 2, roundRobin.metrics.contextSwitches);
  assert('Accumulated waiting time matches completion-time formula', roundRobin.simulation.processes.every(process =>
    process.waitingTime === process.completionTime - process.arrival - process.burst));

  const multicore = simulator.run({
    processes: [
      { pid: '1', arrival: 0, burst: 2, priority: 1 },
      { pid: '2', arrival: 0, burst: 2, priority: 1 }
    ],
    cpuCount: 2,
    algorithm: 'fcfs',
    balancer: 'roundRobin',
    quantum: 2
  });
  assert('Multiple CPUs execute simultaneous arrivals in parallel', multicore.simulation.cpus.map(cpu => cpu.history.join()).join('|') === '1,1|2,2');
  assert('Simultaneous arrivals have deterministic order', multicore.simulation.processes.map(process => process.pid).join() === '1,2');
  assert('No process executes on two CPUs at once', multicore.simulation.processes.every(process =>
    process.executionHistory.every(record =>
      multicore.simulation.cpus[record.cpu].history[record.start] === process.pid
    )));

  const idle = run('fcfs', [{ pid: '1', arrival: 3, burst: 2, priority: 1 }]);
  assert('Idle periods are included in the CPU timeline', idle.simulation.cpus[0].history.join() === ',,,1,1');
  assert('Busy and idle core-ticks are counted', idle.metrics.totalCpuBusyTime === 2 && idle.metrics.totalCpuIdleTime === 3);
  assert('CPU utilization includes idle ticks', idle.metrics.averageCpuUtilization === 0.4);
  assert('Throughput is completed processes per makespan', idle.metrics.throughput === 0.2);
  assert('Makespan includes initial idle time', idle.metrics.makespan === 5);

  const imbalance = simulator.run({
    processes: [
      { pid: '1', arrival: 0, burst: 4, priority: 1 },
      { pid: '2', arrival: 0, burst: 1, priority: 1 }
    ],
    cpuCount: 2,
    algorithm: 'fcfs',
    balancer: 'roundRobin',
    quantum: 2
  });
  assert('Load imbalance is the spread of CPU utilization', imbalance.metrics.loadImbalance === 0.75);
  assert('Per-CPU utilization is reported', imbalance.metrics.perCpuUtilization.join() === '1,0.25');

  const leastLoaded = simulator.run({
    processes: [
      { pid: '1', arrival: 0, burst: 12, priority: 1 },
      { pid: '2', arrival: 0, burst: 9, priority: 1 },
      { pid: '3', arrival: 0, burst: 3, priority: 1 }
    ],
    cpuCount: 2,
    algorithm: 'fcfs',
    balancer: 'least',
    quantum: 2,
    migration: false
  });
  assert('Least-loaded assignment counts both queued and running work', leastLoaded.simulation.processes.map(p => p.cpuId).join() === '0,1,1');
  const randomInput = {
    processes: [
      { pid: '1', arrival: 0, burst: 3, priority: 1 },
      { pid: '2', arrival: 0, burst: 3, priority: 1 },
      { pid: '3', arrival: 0, burst: 3, priority: 1 }
    ],
    cpuCount: 3,
    algorithm: 'fcfs',
    balancer: 'random',
    quantum: 2,
    migration: false
  };
  const randomOne = simulator.run(randomInput, 99);
  const randomTwo = simulator.run(randomInput, 99);
  assert('Random CPU assignment is repeatable with a fixed seed', randomOne.simulation.processes.map(p => p.cpuId).join() === randomTwo.simulation.processes.map(p => p.cpuId).join());

  const mixedWorkload = Array.from({ length: 10 }, (_, index) => ({
    pid: String(index + 1),
    arrival: index % 4,
    burst: index % 5 + 1,
    priority: index % 3 + 1
  }));
  const allAlgorithms = Object.keys(simulator.algorithms);
  assert('Every scheduling algorithm preserves burst and CPU exclusivity in multicore runs',
    allAlgorithms.every(algorithm => {
      const result = simulator.run({
        processes: mixedWorkload,
        cpuCount: 4,
        algorithm,
        balancer: 'least',
        quantum: 2,
        migration: false
      }).simulation;
      return result.processes.every(process =>
        process.executionHistory.length === process.burst &&
        process.executionHistory.every(record =>
          record.start >= process.arrival &&
          result.cpus[record.cpu].history[record.start] === process.pid
        )) &&
        result.cpus.every(cpu => cpu.history.every((pid, tick) => pid === null ||
          result.cpus.every(other => other === cpu || other.history[tick] !== pid)));
    }));

  const referenceInput = [{ pid: '1', arrival: 0, burst: 2, priority: 1 }];
  simulator.run({ processes: referenceInput, cpuCount: 1, algorithm: 'fcfs', balancer: 'least', quantum: 2 });
  assert('Simulation does not mutate its input workload', referenceInput[0].burst === 2 && referenceInput[0].remaining === undefined);

  const migration = simulator.run({
    processes: [
      { pid: '1', arrival: 0, burst: 12, priority: 1 },
      { pid: '2', arrival: 0, burst: 9, priority: 2 },
      { pid: '3', arrival: 1, burst: 3, priority: 1 },
      { pid: '4', arrival: 3, burst: 1, priority: 3 }
    ],
    cpuCount: 2,
    algorithm: 'priority',
    balancer: 'random',
    quantum: 2,
    migration: false
  }, 2);
  assert('Preemption does not silently migrate a process between CPUs', migration.metrics.migrations === 0);
  assert('Preempted processes remain on their assigned CPU without migration', migration.simulation.processes.every(process =>
    process.executionHistory.every(record => record.cpu === process.cpuId)));
  assert('Each process executes exactly its burst time', migration.simulation.processes.every(process =>
    process.executionHistory.length === process.burst));
  assert('Execution history never starts before arrival', migration.simulation.processes.every(process =>
    process.executionHistory.every(record => record.start >= process.arrival)));
  assert('No CPU executes two processes in the same tick', migration.simulation.cpus.every(cpu =>
    cpu.history.every((pid, tick) => pid === null ||
      migration.simulation.cpus.every(other => other === cpu || other.history[tick] !== pid))));

  const dynamicMigration = simulator.run({
      processes: [
        { pid: '1', arrival: 0, burst: 12, priority: 1 },
        { pid: '2', arrival: 0, burst: 9, priority: 2 },
        { pid: '3', arrival: 0, burst: 3, priority: 1 }
      ],
      cpuCount: 2,
      algorithm: 'fcfs',
      balancer: 'roundRobin',
      quantum: 2,
      migration: true,
      migrationInterval: 1,
      migrationThreshold: 0
  });
  assert('Dynamic balancing migrates an eligible waiting job', dynamicMigration.metrics.migrations === 1);
  assert('Migration records the source, destination, and time', JSON.stringify(dynamicMigration.simulation.processes[2].migrationHistory) === JSON.stringify([{time:1,from:0,to:1}]));

  const testMetrics = (waiting, turnaround, response, throughput) => ({
    averageWaitingTime: waiting,
    averageTurnaroundTime: turnaround,
    averageResponseTime: response,
    throughput,
    averageCpuUtilization: 0.5,
    loadImbalance: 0.1
  });
  const alternatives = [
    { algorithm: 'fcfs', metrics: testMetrics(3, 5, 2, 0.4) },
    { algorithm: 'sjf', metrics: testMetrics(1, 4, 1, 0.5) }
  ];
  assert('Recommendation minimizes the selected waiting-time objective', simulator.recommend(alternatives, 'averageWaitingTime').winners[0].algorithm === 'sjf');
  assert('Recommendation maximizes the selected throughput objective', simulator.recommend(alternatives, 'throughput').winners[0].algorithm === 'sjf');
  assert('Recommendation minimizes turnaround time', simulator.recommend(alternatives, 'averageTurnaroundTime').winners[0].algorithm === 'sjf');
  assert('Recommendation minimizes response time', simulator.recommend(alternatives, 'averageResponseTime').winners[0].algorithm === 'sjf');
  const tied = simulator.recommend([
    { algorithm: 'fcfs', metrics: testMetrics(1, 2, 1, 0.5) },
    { algorithm: 'sjf', metrics: testMetrics(1, 2, 1, 0.5) }
  ], 'averageWaitingTime');
  assert('Equal results are reported as a tie', tied.winners.length === 2);
  assert('Balanced objective uses normalized measured metrics', simulator.recommend(alternatives, 'balanced').winners.length > 0);

  let rejectsInvalidInput = false;
  try {
    simulator.create({
      processes: [
        { pid: '1', arrival: 0, burst: 1, priority: 1 },
        { pid: '1', arrival: 0, burst: 1, priority: 1 }
      ],
      cpuCount: 1,
      algorithm: 'fcfs',
      balancer: 'least',
      quantum: 1
    });
  } catch (error) {
    rejectsInvalidInput = error.message.includes('unique');
  }
  assert('Invalid duplicate process IDs are rejected', rejectsInvalidInput);

  summary.textContent = failures.length
    ? `${passed} passed, ${failures.length} failed`
    : `${passed} tests passed`;
  summary.dataset.status = failures.length ? 'failed' : 'passed';
});
