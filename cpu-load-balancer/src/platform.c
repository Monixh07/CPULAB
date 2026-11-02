#define _POSIX_C_SOURCE 200809L /* expose usleep() under strict -std=c99 */
#include <stdio.h>
#include <stdlib.h>
#include "platform.h"

#ifdef _WIN32
#include <windows.h>

void msleep(int ms) {
    if (ms > 0) Sleep((DWORD)ms);
}

void clear_screen(void) {
    system("cls");
}

#else /* POSIX: Linux / macOS */

#include <time.h>

void msleep(int ms) {
    if (ms <= 0) return;
    struct timespec ts;
    ts.tv_sec = ms / 1000;
    ts.tv_nsec = (long)(ms % 1000) * 1000000L;
    nanosleep(&ts, NULL);
}

void clear_screen(void) {
    /* ANSI escape: clear screen + move cursor home. Works on
       Linux/macOS terminals and Windows 10+ consoles. */
    printf("\033[2J\033[H");
    fflush(stdout);
}

#endif
