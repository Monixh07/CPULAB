/*
 * platform.h - tiny OS-portability helpers (Windows / Linux / macOS).
 *
 * Only two things differ between platforms here:
 *   msleep(ms)     - sleep for a few milliseconds (used by the live dashboard)
 *   clear_screen() - clear the terminal (used by the live dashboard)
 */
#ifndef PLATFORM_H
#define PLATFORM_H

void msleep(int ms);
void clear_screen(void);

#endif
