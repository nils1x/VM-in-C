# MAC — Virtual Machine in C

MAC is a simple stack-based virtual machine written in a single C file. It reads a flat list of integers from a `.mac` file and executes them as bytecode.

Rating:
- Overall: 8/10 - really nice for understanding basic C operations, as well as getting into what's actually happening behind the scenes
- Feelings: 5/10 - though I've never been a big fan of C, this project still kind of catched me
- Debuggability pain: 2/10 - totally fine, LLDB is great, but complex to learn
- Rewrite urge: 0/10 - since I implemented the first instructions and it first compiled with **primarily warnings**, this was not quite a problem
- Stack trace nightmares: 9/10 - **somehow** I still can't figure out, what happened at the end of this project with the compiler going completely ***COWABUNGA***, but as the saying goes: *If it runs, don't touch it!*

---

## Building & Running

```bash
gcc mac.c -o mac
./mac program.mac
```

---

## Architecture

### Registers

|Register|Purpose|
|---|---|
|`A` `B` `C` `D` `E` `F`|General purpose|
|`I` `J`|General purpose (index)|
|`EX`|Excess / overflow|
|`EXA`|Additional excess|
|`IP`|Instruction pointer|
|`SP`|Stack pointer|

The stack is a fixed array of 256 integers (`STACK_SIZE 256`). `SP` starts at `-1` and grows upward.

### Instruction Cycle

**fetch → decode → execute**

Each iteration of the main loop fetches the instruction at `instructions[IP]`, passes it to `eval()`, then increments `IP` by 1 (unless a jump instruction has already moved it).

---

## Instruction Set

|Opcode|Val|Usage|Description|
|---|---|---|---|
|`HLT`|0|`hlt`|Halt the program|
|`PSH`|1|`psh val`|Push `val` onto the stack|
|`POP`|2|`pop`|Pop the top of the stack|
|`ADD`|3|`add`|Pop top two values, push their sum|
|`MUL`|4|`mul`|Pop top two values, push their product|
|`DIV`|5|`div`|Pop top two values, push their quotient|
|`SUB`|6|`sub`|Pop top two values, push their difference|
|`SLT`|7|`slt`|Pop top two values, push `1` if second < top, else `0`|
|`MOV`|8|`mov reg_a reg_b`|Copy value from `reg_a` into `reg_b`|
|`SET`|9|`set reg val`|Set register `reg` to `val`|
|`LOG`|10|`log reg`|Print the value of register `reg`|
|`IF`|11|`if reg val ip`|If `reg == val`, jump to `ip`|
|`IFN`|12|`ifn reg val ip`|If `reg != val`, jump to `ip`|
|`GLD`|13|`gld reg`|Push the value of register `reg` onto the stack|
|`GPT`|14|`gpt reg`|Pop the top of the stack into register `reg`|
|`NOP`|15|`nop`|No operation|

### Multi-byte instructions

Instructions that take operands consume the following bytes in the stream as arguments — there is no separator. For example `IFN` always reads the next **3** values:

```
index: ...  15  16  17  18  ...
value: ...  12   2   5   6  ...
            ^    ^   ^   ^
          IFN  reg val  jump target
```

You need to know each instruction's width to correctly read the stream.

---

## Writing Programs

Programs are plain text files containing space or newline-separated integers. The VM loads them all into memory before executing.

### Example — `test.mac`

A loop that counts from 1 to 5, logging each value.

```
9 2 0 9 0 1 13 2 13 0 3 14 2 10 2 12 2 5 6 0
```

Broken down:

|Bytes|Instruction|Effect|
|---|---|---|
|`9 2 0`|`SET C 0`|Initialize counter to 0|
|`9 0 1`|`SET A 1`|A = the increment value|
|`13 2`|`GLD C`|Push C onto the stack|
|`13 0`|`GLD A`|Push A onto the stack|
|`3`|`ADD`|Pop both, push sum; also updates C|
|`14 2`|`GPT C`|Pop result back into C|
|`10 2`|`LOG C`|Print C|
|`12 2 5 6`|`IFN C 5 goto 6`|If C != 5, jump back to `GLD C` at IP 6|
|`0`|`HLT`|Done|

### Terminal output explained

```
9              ← raw bytecode dump from the file loader (not program output)
2
0
...
0 + 1 = 1      ← ADD prints both operands and result on every call
1              ← LOG C prints the counter
1 + 1 = 2
2
2 + 1 = 3
3
3 + 1 = 4
4
4 + 1 = 5
5
Finished Execution
```

The first block of numbers is a **debug dump** — the VM echoes each raw integer as it loads the file. Execution begins after that. `ADD` always prints its operands and result via a hardcoded `printf` in `eval()`.

---

## Visualizer

An interactive browser-based visualizer is included (`mac_vm_visualization.html`) that lets you explore the VM's internals without touching the C code.

**What it shows:**
- All 12 registers with their current values in hex, updating live as you execute instructions
- The full stack (10 visible slots), with color-coded highlights showing which cells are being read, written, or popped at any given moment
- The complete instruction set — click any instruction to expand it and see a plain English description of what it does to the stack, plus a before/after diagram for all stack-manipulating operations

**What you can do:**
- Push any value onto the stack and watch SP update
- Execute `ADD`, `SUB`, `MUL`, `DIV`, and `SLT` directly — the animation briefly highlights the two operands before replacing them with the result
- Step `IP` forward through the instruction list
- Read the execution log at the bottom, which records every operation with the actual values involved

Open `mac_vm_visualization.html` in any browser — no server or build step needed.

---

## Register Reference (enum values)

```
A=0  B=1  C=2  D=3  E=4  F=5  I=6  J=7
EX=8  EXA=9  IP=10  SP=11
```

These numeric values are what you use in `.mac` files when an instruction takes a register argument. For example `LOG 2` prints register `C`.

---

Credits: https://web.archive.org/web/20200121100942/https://blog.felixangell.com/virtual-machine-in-c/