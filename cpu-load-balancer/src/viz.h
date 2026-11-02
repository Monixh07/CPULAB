/*
 * viz.h - text visualization: the live dashboard and utilization bars.
 */
#ifndef VIZ_H
#define VIZ_H

#include "sim.h"
#include "stats.h"

/* Redrawn every tick while a simulation runs in live mode. */
void viz_dashboard(const Sim *s);

/* Per-CPU utilization bars, printed with the final stats. */
void viz_bars(const Sim *s, const Stats *st);

#endif
