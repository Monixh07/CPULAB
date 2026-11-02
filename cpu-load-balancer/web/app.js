'use strict';

const DEMO_PROCESSES = [
  { pid: 'P1', arrival: 0, burst: 14, priority: 3 },
  { pid: 'P2', arrival: 0, burst: 6, priority: 2 },
  { pid: 'P3', arrival: 0, burst: 20, priority: 4 },
  { pid: 'P4', arrival: 1, burst: 4, priority: 1 },
  { pid: 'P5', arrival: 1, burst: 9, priority: 3 },
  { pid: 'P6', arrival: 2, burst: 12, priority: 2 },
  { pid: 'P7', arrival: 2, burst: 3, priority: 5 },
  { pid: 'P8', arrival: 3, burst: 18, priority: 1 },
  { pid: 'P9', arrival: 3, burst: 7, priority: 4 },
  { pid: 'P10', arrival: 4, burst: 5, priority: 2 },
  { pid: 'P11', arrival: 4, burst: 11, priority: 3 },
  { pid: 'P12', arrival: 5, burst: 2, priority: 1 },
  { pid: 'P13', arrival: 5, burst: 15, priority: 2 },
  { pid: 'P14', arrival: 6, burst: 8, priority: 4 },
  { pid: 'P15', arrival: 7, burst: 10, priority: 3 },
  { pid: 'P16', arrival: 8, burst: 6, priority: 2 }
];

const ALGORITHMS = CPULabSimulator.algorithms;
const OBJECTIVES = {
  averageWaitingTime: { label: 'average waiting time', direction: 'min' },
  averageTurnaroundTime: { label: 'average turnaround time', direction: 'min' },
  averageResponseTime: { label: 'average response time', direction: 'min' },
  throughput: { label: 'throughput', direction: 'max' },
  averageCpuUtilization: { label: 'average CPU utilization', direction: 'max' },
  makespan: { label: 'makespan', direction: 'min' }
};

const elements = {
  cpuCount: document.querySelector('#cpu-count'),
  algorithm: document.querySelector('#algorithm'),
  balancer: document.querySelector('#balancer'),
  quantum: document.querySelector('#quantum'),
  quantumField: document.querySelector('#quantum-field'),
  priorityMode: document.querySelector('#priority-mode'),
  priorityModeField: document.querySelector('#priority-mode-field'),
  migration: document.querySelector('#migration'),
  objective: document.querySelector('#objective'),
  speed: document.querySelector('#speed'),
  workloadBody: document.querySelector('#workload-body'),
  processCount: document.querySelector('#process-count'),
  desiredCount: document.querySelector('#desired-count'),
  validation: document.querySelector('#validation-message'),
  runButton: document.querySelector('#run-button'),
  compareButton: document.querySelector('#compare-button'),
  pauseButton: document.querySelector('#pause-button'),
  resumeButton: document.querySelector('#resume-button'),
  stepButton: document.querySelector('#step-button'),
  resetSimulationButton: document.querySelector('#reset-simulation-button'),
  statusDot: document.querySelector('#status-dot'),
  statusText: document.querySelector('#status-text'),
  tickLabel: document.querySelector('#tick-label'),
  cpuGrid: document.querySelector('#cpu-grid'),
  readyQueue: document.querySelector('#ready-queue'),
  processStateSummary: document.querySelector('#process-state-summary'),
  metricTime: document.querySelector('#metric-time'),
  metricWait: document.querySelector('#metric-wait'),
  metricTurnaround: document.querySelector('#metric-turnaround'),
  metricResponse: document.querySelector('#metric-response'),
  metricThroughput: document.querySelector('#metric-throughput'),
  metricUtil: document.querySelector('#metric-util'),
  metricImbalance: document.querySelector('#metric-imbalance'),
  metricSwitches: document.querySelector('#metric-switches'),
  metricBusy: document.querySelector('#metric-busy'),
  metricIdle: document.querySelector('#metric-idle'),
  metricAggregate: document.querySelector('#metric-aggregate'),
  metricMigrations: document.querySelector('#metric-migrations'),
  metricCompleted: document.querySelector('#metric-completed'),
  progressValue: document.querySelector('#progress-value'),
  progressBar: document.querySelector('#progress-bar'),
  strategyTitle: document.querySelector('#strategy-title'),
  strategyDescription: document.querySelector('#strategy-description'),
  comparisonSection: document.querySelector('#comparison-section'),
  comparisonCaption: document.querySelector('#comparison-caption'),
  comparisonChart: document.querySelector('#comparison-chart'),
  comparisonBody: document.querySelector('#comparison-body'),
  comparisonVerdict: document.querySelector('#comparison-verdict'),
  sortMetric: document.querySelector('#sort-metric'),
  processSection: document.querySelector('#process-section'),
  processBody: document.querySelector('#process-body'),
  ganttSection: document.querySelector('#gantt-section'),
  ganttChart: document.querySelector('#gantt-chart'),
  formulaNote: document.querySelector('#formula-note')
};

let simulation = null;
let interval = null;
let paused = false;
let lastComparison = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function displayPid(pid) {
  const value = String(pid);
  return /^[Pp]/.test(value) ? value : `P${value}`;
}

function nextProcessId(processes) {
  const ids = new Set(processes.map(process => String(process.pid).toLowerCase()));
  let number = processes.length + 1;
  while (ids.has(`p${number}`)) number++;
  return `P${number}`;
}

function renderWorkload(processes) {
  elements.workloadBody.innerHTML = processes.map((process, index) => `
    <tr>
      <td><input aria-label="Process ${index + 1} ID" data-field="pid" value="${escapeHtml(process.pid)}" maxlength="24"></td>
      <td><input aria-label="Process ${index + 1} arrival time" data-field="arrival" type="number" min="0" step="1" value="${escapeHtml(process.arrival)}"></td>
      <td><input aria-label="Process ${index + 1} burst time" data-field="burst" type="number" min="1" step="1" value="${escapeHtml(process.burst)}"></td>
      <td><input aria-label="Process ${index + 1} priority" data-field="priority" type="number" min="1" step="1" value="${escapeHtml(process.priority)}"></td>
      <td><button class="remove-process" type="button" data-remove="${index}" aria-label="Remove process ${escapeHtml(process.pid)}">Remove</button></td>
    </tr>`).join('');
  updateWorkloadCount();
  elements.desiredCount.value = processes.length;
}

function updateWorkloadCount() {
  const count = elements.workloadBody.querySelectorAll('tr').length;
  elements.processCount.textContent = `${count} process${count === 1 ? '' : 'es'}`;
}

function readWorkload() {
  const rows = [...elements.workloadBody.querySelectorAll('tr')];
  return rows.map((row, index) => {
    const value = field => row.querySelector(`[data-field="${field}"]`).value.trim();
    const arrival = Number(value('arrival'));
    const burst = Number(value('burst'));
    const priority = Number(value('priority'));
    if (!value('pid')) throw new Error(`Process ${index + 1} needs an ID.`);
    if (value('arrival') === '') throw new Error(`Process ${value('pid')} needs an arrival time.`);
    if (value('burst') === '') throw new Error(`Process ${value('pid')} needs a burst time.`);
    if (value('priority') === '') throw new Error(`Process ${value('pid')} needs a priority.`);
    if (!Number.isInteger(arrival) || arrival < 0) throw new Error(`Process ${value('pid')} needs a non-negative integer arrival time.`);
    if (!Number.isInteger(burst) || burst < 1) throw new Error(`Process ${value('pid')} needs a positive integer burst time.`);
    if (!Number.isInteger(priority) || priority < 1) throw new Error(`Process ${value('pid')} needs a positive integer priority.`);
    return { pid: value('pid'), arrival, burst, priority };
  });
}

function readConfig(algorithm) {
  return {
    processes: readWorkload(),
    cpuCount: Number(elements.cpuCount.value),
    algorithm: algorithm || elements.algorithm.value,
    balancer: elements.balancer.value,
    quantum: Number(elements.quantum.value),
    preemptivePriority: elements.priorityMode.value === 'preemptive',
    migration: elements.migration.checked,
    migrationInterval: 15,
    migrationThreshold: 8
  };
}

function formatNumber(number, digits = 1) {
  return Number.isInteger(number) ? String(number) : number.toFixed(digits);
}

function updateAlgorithmHelp() {
  const algorithm = elements.algorithm.value;
  elements.strategyTitle.textContent = ALGORITHMS[algorithm].name;
  elements.strategyDescription.textContent = ALGORITHMS[algorithm].description;
  elements.quantumField.hidden = algorithm !== 'rr';
  elements.priorityModeField.hidden = algorithm !== 'priority';
}

function updateMetrics(current) {
  const complete = current.completed === current.processes.length;
  const values = complete ? CPULabSimulator.metrics(current) : null;
  elements.metricTime.textContent = `${current.time}`;
  elements.metricWait.textContent = values ? formatNumber(values.averageWaitingTime) : '—';
  elements.metricTurnaround.textContent = values ? formatNumber(values.averageTurnaroundTime) : '—';
  elements.metricResponse.textContent = values ? formatNumber(values.averageResponseTime) : '—';
  elements.metricThroughput.textContent = values ? values.throughput.toFixed(3) : '—';
  elements.metricUtil.textContent = values ? `${Math.round(values.averageCpuUtilization * 100)}%` : '—';
  elements.metricImbalance.textContent = values ? `${(values.loadImbalance * 100).toFixed(1)}%` : '—';
  elements.metricSwitches.textContent = values ? `${values.contextSwitches}` : '—';
  elements.metricBusy.textContent = values ? `${values.totalCpuBusyTime}` : '—';
  elements.metricIdle.textContent = values ? `${values.totalCpuIdleTime}` : '—';
  elements.metricAggregate.textContent = values ? `${(values.aggregateCpuUtilization * 100).toFixed(1)}%` : '—';
  elements.metricMigrations.textContent = values ? `${values.migrations}` : '—';
  elements.metricCompleted.textContent = `${current.completed}`;
  elements.progressValue.textContent = `${current.completed} / ${current.processes.length}`;
  elements.progressBar.style.width = `${100 * current.completed / current.processes.length}%`;
  elements.tickLabel.textContent = `TICK ${current.time}`;
  const ready = current.cpus.flatMap(cpu => cpu.queue.map(index => current.processes[index].pid));
  elements.readyQueue.textContent = ready.length
    ? ready.map(displayPid).join(' · ')
    : 'No processes waiting';
  const running = new Set(current.cpus.map(cpu => cpu.running).filter(index => index !== null));
  const processStates = { New: [], Ready: [], Running: [], Completed: [] };
  for (let index = 0; index < current.processes.length; index++) {
    const process = current.processes[index];
    if (process.completionTime !== null) processStates.Completed.push(displayPid(process.pid));
    else if (running.has(index)) processStates.Running.push(displayPid(process.pid));
    else if (process.arrival > current.time) processStates.New.push(displayPid(process.pid));
    else processStates.Ready.push(displayPid(process.pid));
  }
  elements.processStateSummary.innerHTML = Object.entries(processStates).map(([state, processes]) =>
    `<span class="state-chip"><strong>${state}</strong> ${processes.length ? processes.map(escapeHtml).join(', ') : '—'}</span>`
  ).join('');
}

function renderCpus(current, complete) {
  const maximumLoad = Math.max(1, ...current.cpus.map(cpu => CPULabSimulator.cpuLoad(current, cpu)));
  elements.cpuGrid.innerHTML = current.cpus.map(cpu => {
    const process = cpu.running === null ? null : current.processes[cpu.running];
    const load = CPULabSimulator.cpuLoad(current, cpu);
    const state = process ? 'Running' : complete ? 'Finished' : 'Idle';
    const currentText = process
      ? `${escapeHtml(displayPid(process.pid))} · ${process.remaining} ticks left`
      : 'No process running';
    const waiting = cpu.queue.length
      ? cpu.queue.map(index => escapeHtml(displayPid(current.processes[index].pid))).join(' · ')
      : 'No waiting processes';
    const utilization = complete && current.time ? Math.round(cpu.busyTicks / current.time * 100) : null;
    return `<article class="cpu-card">
      <div class="cpu-card-head"><span class="cpu-name">CPU ${cpu.id + 1}</span><span class="cpu-state">${state}</span></div>
      <div class="cpu-process${process ? '' : ' is-idle'}">${currentText}</div>
      <div class="load-track" role="progressbar" aria-label="CPU ${cpu.id + 1} remaining load" aria-valuemin="0" aria-valuemax="${maximumLoad}" aria-valuenow="${load}">
        <div class="load-fill" style="width:${Math.round(load / maximumLoad * 100)}%"></div>
      </div>
      <div class="cpu-queue">Ready: ${waiting}</div>
      <div class="cpu-meta"><span>Load <strong>${load} ticks</strong></span><span>${complete ? `${utilization}% busy` : 'Available'}</span></div>
    </article>`;
  }).join('');
}

function renderGantt(current) {
  elements.ganttChart.innerHTML = current.cpus.map(cpu => {
    const intervals = [];
    for (let tick = 0; tick < cpu.history.length; tick++) {
      const pid = cpu.history[tick];
      const last = intervals[intervals.length - 1];
      if (last && last.pid === pid) last.end = tick + 1;
      else intervals.push({ pid, start: tick, end: tick + 1 });
    }
    const blocks = intervals.map(segment => {
      const duration = segment.end - segment.start;
      const className = segment.pid === null ? 'gantt-block gantt-idle' : 'gantt-block';
      const label = segment.pid === null ? 'Idle' : escapeHtml(displayPid(segment.pid));
      const tooltip = `${label}: ${segment.start}–${segment.end} (${duration} tick${duration === 1 ? '' : 's'})`;
      return `<div class="${className}" style="flex:${duration}" title="${tooltip}" aria-label="${tooltip}">${label}<small>${segment.start}–${segment.end}</small></div>`;
    }).join('');
    return `<div class="gantt-row"><span class="gantt-cpu">CPU ${cpu.id + 1}</span><div class="gantt-track">${blocks || '<span class="gantt-empty">Waiting for execution</span>'}</div></div>`;
  }).join('');
  elements.ganttSection.hidden = false;
}

function renderProcessTable(current) {
  elements.processBody.innerHTML = current.processes.map(process => {
    const turnaround = process.completionTime - process.arrival;
    const response = process.startTime - process.arrival;
    const cpus = [...new Set(process.executionHistory.map(intervalRecord => intervalRecord.cpu + 1))];
    return `<tr>
      <td>${escapeHtml(displayPid(process.pid))}</td><td>${process.arrival}</td><td>${process.burst}</td>
      <td>${process.priority}</td><td>${process.startTime}</td>
      <td>${cpus.map(cpu => `CPU ${cpu}`).join(', ')}</td><td>${process.completionTime}</td>
      <td>${process.waitingTime} ticks</td><td>${turnaround} ticks</td><td>${response} ticks</td>
      <td>${process.executionHistory.map(record => `CPU ${record.cpu + 1} ${record.start}–${record.end}`)
        .concat(process.migrationHistory.map(record => `Moved CPU ${record.from + 1}→${record.to + 1} at ${record.time}`))
        .join('; ')}</td>
    </tr>`;
  }).join('');
  elements.processSection.hidden = false;
}

function renderSimulation(current) {
  const complete = current.completed === current.processes.length;
  updateMetrics(current);
  renderCpus(current, complete);
  if (complete) {
    renderProcessTable(current);
    renderGantt(current);
  } else {
    elements.processSection.hidden = true;
    elements.ganttSection.hidden = true;
  }
}

function setStatus(message, state) {
  elements.statusText.textContent = message;
  elements.statusDot.className = `status-dot${state ? ` is-${state}` : ''}`;
}

function stopInterval() {
  if (interval !== null) window.clearInterval(interval);
  interval = null;
}

function setRunControls(running, finished) {
  const locked = running || paused;
  elements.runButton.disabled = running;
  elements.compareButton.disabled = running;
  elements.pauseButton.disabled = !running;
  elements.resumeButton.disabled = running || !paused || finished;
  elements.stepButton.disabled = running || finished || !simulation;
  elements.resetSimulationButton.disabled = !simulation;
  elements.cpuCount.disabled = locked;
  elements.algorithm.disabled = locked;
  elements.balancer.disabled = locked;
  elements.quantum.disabled = locked;
  elements.priorityMode.disabled = locked;
  elements.migration.disabled = locked;
  elements.objective.disabled = locked;
  elements.desiredCount.disabled = locked;
  for (const control of elements.workloadBody.querySelectorAll('input, button')) {
    control.disabled = locked;
  }
  for (const button of document.querySelectorAll('.workload-actions button')) {
    button.disabled = locked;
  }
}

function finishSimulation() {
  stopInterval();
  paused = false;
  setRunControls(false, true);
  setStatus(`Finished in ${simulation.time} ticks`, 'done');
  renderSimulation(simulation);
}

function advanceOneTick() {
  if (!simulation || simulation.completed === simulation.processes.length) return;
  CPULabSimulator.step(simulation);
  renderSimulation(simulation);
  if (simulation.completed === simulation.processes.length) finishSimulation();
  else if (paused) setStatus(`Paused at tick ${simulation.time}`, '');
}

function runAtSelectedSpeed() {
  stopInterval();
  interval = window.setInterval(advanceOneTick, Number(elements.speed.value));
}

function startSimulation() {
  stopInterval();
  try {
    elements.validation.textContent = '';
    const input = readConfig();
    CPULabSimulator.validateInput(input);
    lastComparison = null;
    elements.comparisonSection.hidden = true;
    elements.processSection.hidden = true;
    elements.ganttSection.hidden = true;
    elements.formulaNote.hidden = true;
    simulation = CPULabSimulator.create(input, 42);
    paused = false;
    setRunControls(true, false);
    setStatus('Simulation running', 'running');
    renderSimulation(simulation);
    runAtSelectedSpeed();
  } catch (error) {
    elements.validation.textContent = error.message;
    setStatus('Check your settings', '');
  }
}

function pauseSimulation() {
  if (!simulation || interval === null) return;
  stopInterval();
  paused = true;
  setRunControls(false, false);
  setStatus(`Paused at tick ${simulation.time}`, '');
}

function resumeSimulation() {
  if (!simulation || !paused) return;
  paused = false;
  setRunControls(true, false);
  setStatus('Simulation running', 'running');
  runAtSelectedSpeed();
}

function resetSimulation() {
  stopInterval();
  paused = false;
  elements.comparisonSection.hidden = true;
  elements.processSection.hidden = true;
  elements.ganttSection.hidden = true;
  elements.formulaNote.hidden = true;
  if (simulation) {
    simulation = CPULabSimulator.create(readConfig(), 42);
    renderSimulation(simulation);
  } else {
    elements.cpuGrid.innerHTML = '<div class="empty-state">Choose your setup and run a simulation to see the CPUs in action.</div>';
    elements.metricTime.textContent = '—';
    elements.metricWait.textContent = '—';
    elements.metricTurnaround.textContent = '—';
    elements.metricResponse.textContent = '—';
    elements.metricThroughput.textContent = '—';
    elements.metricUtil.textContent = '—';
    elements.metricImbalance.textContent = '—';
    elements.metricSwitches.textContent = '—';
    elements.metricBusy.textContent = '—';
    elements.metricIdle.textContent = '—';
    elements.metricAggregate.textContent = '—';
    elements.metricMigrations.textContent = '—';
    elements.metricCompleted.textContent = '0';
    elements.progressValue.textContent = `0 / ${elements.workloadBody.querySelectorAll('tr').length}`;
    elements.progressBar.style.width = '0%';
    elements.readyQueue.textContent = '—';
    elements.processStateSummary.textContent = '';
    elements.tickLabel.textContent = 'TICK —';
  }
  lastComparison = null;
  elements.validation.textContent = '';
  setRunControls(false, false);
  setStatus('Ready to run', '');
}

function renderComparison() {
  if (!lastComparison) return;
  const objective = elements.objective.value;
  const metric = elements.sortMetric.value;
  const direction = OBJECTIVES[metric].direction;
  const rows = [...lastComparison];
  rows.sort((a, b) => direction === 'min'
    ? a.metrics[metric] - b.metrics[metric]
    : b.metrics[metric] - a.metrics[metric]);
  const recommendation = CPULabSimulator.recommend(lastComparison, objective);
  const winners = new Set(recommendation.winners.map(row => row.algorithm));
  const maximum = Math.max(...rows.map(row => Math.abs(row.metrics[metric])), Number.EPSILON);
  const minimum = Math.min(...rows.map(row => row.metrics[metric]));
  const maximumMetric = Math.max(...rows.map(row => row.metrics[metric]));
  const chartLabel = elements.sortMetric.options[elements.sortMetric.selectedIndex].textContent;
  elements.comparisonChart.setAttribute('aria-label', `${chartLabel} comparison chart`);
  elements.comparisonChart.innerHTML = `<span class="chart-heading">${escapeHtml(chartLabel)} · ${direction === 'min' ? 'shorter is better' : 'higher is better'}</span>` +
    rows.map(row => {
      const value = row.metrics[metric];
      const width = maximumMetric === minimum
        ? 100
        : direction === 'min'
          ? 10 + (maximumMetric - value) / (maximumMetric - minimum) * 90
          : Math.max(value > 0 ? 2 : 0, Math.abs(value) / maximum * 100);
      return `<div class="chart-row"><span>${escapeHtml(ALGORITHMS[row.algorithm].name)}</span><div class="chart-track"><div class="chart-bar${winners.has(row.algorithm) ? ' chart-bar-best' : ''}" style="width:${width}%"></div></div><strong>${metric === 'averageCpuUtilization' ? `${(value * 100).toFixed(1)}%` : formatNumber(value, 3)}</strong></div>`;
    }).join('');

  elements.comparisonBody.innerHTML = rows.map(row => `
    <tr class="${winners.has(row.algorithm) ? 'best-row' : ''}">
      <td>${ALGORITHMS[row.algorithm].name}</td>
      <td>${formatNumber(row.metrics.averageWaitingTime)}</td>
      <td>${formatNumber(row.metrics.averageTurnaroundTime)}</td>
      <td>${formatNumber(row.metrics.averageResponseTime)}</td>
      <td>${row.metrics.throughput.toFixed(3)}</td>
      <td>${(row.metrics.averageCpuUtilization * 100).toFixed(1)}%</td>
      <td>${row.metrics.makespan}</td>
      <td>${(row.metrics.loadImbalance * 100).toFixed(1)}%</td>
      <td>${row.metrics.contextSwitches}</td>
      <td>${row.metrics.migrations}</td>
    </tr>`).join('');

  const goal = elements.objective.options[elements.objective.selectedIndex].textContent.toLowerCase();
  let message;
  if (recommendation.winners.length > 1) {
    message = `Tie: ${recommendation.winners.map(row => ALGORITHMS[row.algorithm].name).join(', ')} achieve the same best result for ${goal}.`;
  } else {
    const winner = recommendation.winners[0];
    const key = objective === 'balanced' ? null : objective;
    const value = recommendation.value;
    const detail = objective === 'balanced'
      ? `balanced score ${(recommendation.value * 100).toFixed(1)} / 100`
      : objective === 'averageCpuUtilization'
        ? `${(value * 100).toFixed(1)}%`
        : `${formatNumber(value, 3)} ${objective === 'throughput' ? 'processes/tick' : 'ticks'}`;
    message = `${ALGORITHMS[winner.algorithm].name} is best for this workload for ${goal} (${detail}).`;
    const alternatives = lastComparison.filter(row => row.algorithm !== winner.algorithm);
    if (alternatives.length) {
      const values = alternatives.map(row => row.metrics[key]).filter(Number.isFinite);
      if (values.length && key && OBJECTIVES[key]) {
        const other = OBJECTIVES[key].direction === 'min' ? Math.min(...values) : Math.max(...values);
        const denominator = Math.abs(other);
        if (denominator > 0) {
          const improvement = Math.abs(value - other) / denominator * 100;
          message += ` That is ${improvement.toFixed(1)}% ${OBJECTIVES[key].direction === 'min' ? 'lower' : 'higher'} than the next-best result.`;
        }
      }
    }
    message += ` Trade-off: ${ALGORITHMS[winner.algorithm].description} Results depend on this workload and CPU assignment; no algorithm is best for every workload.`;
  }
  const worst = chooseWorst(lastComparison, objective);
  const worstOnly = worst.filter(row => !winners.has(row.algorithm));
  if (worstOnly.length === 1) {
    message += ` ${ALGORITHMS[worstOnly[0].algorithm].name} scored worst for this objective in this comparison.`;
  } else if (worstOnly.length > 1) {
    message += ` Worst-result tie: ${worstOnly.map(row => ALGORITHMS[row.algorithm].name).join(', ')}.`;
  }
  if (objective === 'balanced') {
    message += ' Balanced score gives equal weight to normalized waiting, turnaround, response, throughput, utilization, and load-imbalance metrics.';
  }
  elements.comparisonVerdict.textContent = message;
  elements.comparisonSection.hidden = false;
}

function chooseWorst(rows, objective) {
  const recommendation = CPULabSimulator.recommend(rows, objective);
  const direction = recommendation.direction === 'min' ? 'max' : 'min';
  const target = recommendation.scores.reduce((selected, item) =>
    direction === 'min' ? Math.min(selected, item.value) : Math.max(selected, item.value),
  recommendation.scores[0].value);
  return recommendation.scores
    .filter(item => Math.abs(item.value - target) < 1e-10)
    .map(item => item.row);
}

function invalidateCompletedRun() {
  if (simulation && simulation.completed === simulation.processes.length) resetSimulation();
}

function compareAlgorithms() {
  stopInterval();
  try {
    elements.validation.textContent = '';
    const base = readConfig();
    CPULabSimulator.validateInput(base);
    paused = false;
    simulation = null;
    setRunControls(false, true);
    const algorithms = Object.keys(ALGORITHMS);
    lastComparison = algorithms.map(algorithm => {
      const input = { ...base, algorithm };
      const result = CPULabSimulator.run(input, 12345);
      return { algorithm, simulation: result.simulation, metrics: result.metrics };
    });
    const selected = lastComparison.find(result => result.algorithm === base.algorithm);
    simulation = selected.simulation;
    renderSimulation(simulation);
    renderProcessTable(simulation);
    renderGantt(simulation);
    elements.comparisonCaption.textContent =
      `${base.cpuCount} CPUs · ${base.processes.length} processes · same workload`;
    renderComparison();
    elements.processSection.hidden = false;
    elements.formulaNote.hidden = false;
    setStatus('Comparison complete', 'done');
    setRunControls(false, true);
  } catch (error) {
    elements.validation.textContent = error.message;
    setStatus('Check your settings', '');
  }
}

function generateRandomWorkload() {
  const count = Math.max(1, Math.min(500, Number(elements.workloadBody.querySelectorAll('tr').length) || 8));
  let seed = Math.floor(Date.now() % 4294967296);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  renderWorkload(Array.from({ length: count }, (_, index) => ({
    pid: `P${index + 1}`,
    arrival: Math.floor(random() * 9),
    burst: 1 + Math.floor(random() * 20),
    priority: 1 + Math.floor(random() * 5)
  })));
  resetSimulation();
}

elements.runButton.addEventListener('click', startSimulation);
elements.compareButton.addEventListener('click', compareAlgorithms);
elements.pauseButton.addEventListener('click', pauseSimulation);
elements.resumeButton.addEventListener('click', resumeSimulation);
elements.stepButton.addEventListener('click', advanceOneTick);
elements.resetSimulationButton.addEventListener('click', resetSimulation);
elements.speed.addEventListener('change', () => {
  if (interval !== null) runAtSelectedSpeed();
});
elements.algorithm.addEventListener('change', () => {
  updateAlgorithmHelp();
  invalidateCompletedRun();
});
for (const control of [elements.cpuCount, elements.balancer, elements.quantum, elements.priorityMode, elements.migration]) {
  control.addEventListener('change', invalidateCompletedRun);
}
elements.sortMetric.addEventListener('change', renderComparison);
elements.objective.addEventListener('change', renderComparison);
elements.workloadBody.addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const rows = [...elements.workloadBody.querySelectorAll('tr')];
  if (rows.length === 1) {
    elements.validation.textContent = 'A workload must contain at least one process.';
    return;
  }
  rows[Number(button.dataset.remove)].remove();
  [...elements.workloadBody.querySelectorAll('tr')].forEach((row, index) => {
    row.querySelectorAll('[data-field]').forEach(input => {
      input.setAttribute('aria-label', `Process ${index + 1} ${input.dataset.field}`);
    });
    row.querySelector('[data-remove]').dataset.remove = index;
  });
  updateWorkloadCount();
  elements.validation.textContent = '';
  resetSimulation();
});
elements.workloadBody.addEventListener('input', () => {
  elements.validation.textContent = '';
  updateWorkloadCount();
  stopInterval();
  simulation = null;
  elements.comparisonSection.hidden = true;
  elements.processSection.hidden = true;
  elements.ganttSection.hidden = true;
  elements.formulaNote.hidden = true;
  setRunControls(false, false);
  setStatus('Workload edited', '');
});
document.querySelector('#sample-button').addEventListener('click', () => {
  renderWorkload(DEMO_PROCESSES);
  resetSimulation();
});
document.querySelector('#add-process-button').addEventListener('click', () => {
  const count = elements.workloadBody.querySelectorAll('tr').length;
  if (count >= 500) {
    elements.validation.textContent = 'A workload can contain at most 500 processes.';
    return;
  }
  try {
    renderWorkload([
      ...readWorkload(),
      { pid: nextProcessId(readWorkload()), arrival: 0, burst: 5, priority: 1 }
    ]);
    elements.validation.textContent = '';
    resetSimulation();
  } catch (error) {
    elements.validation.textContent = error.message;
  }
});
document.querySelector('#random-button').addEventListener('click', generateRandomWorkload);
document.querySelector('#apply-count-button').addEventListener('click', () => {
  const count = Number(elements.desiredCount.value);
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    elements.validation.textContent = 'Process count must be an integer from 1 to 500.';
    return;
  }
  try {
    const current = readWorkload();
    const next = current.slice(0, count);
    for (let index = next.length; index < count; index++) {
      next.push({ pid: nextProcessId(next), arrival: 0, burst: 5, priority: 1 });
    }
    renderWorkload(next);
    elements.validation.textContent = '';
    resetSimulation();
  } catch (error) {
    elements.validation.textContent = error.message;
  }
});
document.querySelector('#reset-button').addEventListener('click', () => {
  renderWorkload(DEMO_PROCESSES);
  elements.cpuCount.value = '4';
  elements.algorithm.value = 'fcfs';
  elements.balancer.value = 'least';
  elements.quantum.value = '4';
  elements.priorityMode.value = 'preemptive';
  elements.migration.checked = true;
  elements.objective.value = 'averageWaitingTime';
  updateAlgorithmHelp();
  resetSimulation();
});

renderWorkload(DEMO_PROCESSES);
updateAlgorithmHelp();
setRunControls(false, false);
