# CPU Load Balancing Simulator - Makefile (Linux / macOS)
# Usage:  make          -> builds ./cpulb
#         make clean    -> removes the binary

CC = gcc
CFLAGS = -std=c99 -Wall -Wextra -O2
SRC = $(wildcard src/*.c)

cpulb: $(SRC)
	$(CC) $(CFLAGS) -o cpulb $(SRC)

clean:
	rm -f cpulb

.PHONY: clean
