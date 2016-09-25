#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define NIL 9920901
#define MAX_DEPTH 30
#define MAX_INSTR 100
#define MAX_INSTR_LEN 16
#define DEBUG_INSTR 0
#define DEBUG_STACK 0

void dump_stack(void);
void add_instr(int code, int arg1);
void add_label(int addr);
int exec(int code, int arg1);
int instr_to_code(char* line);
int jump(int addr);
void push(int x);
int pop(void);
int peek(void);

int ip = 0; /* Instruction pointer */
int lp = 0; /* Label pointer */
int instructions[MAX_INSTR] = {0};
int args[MAX_INSTR] = {0};
int labels[MAX_INSTR] = {NIL};
int stack[MAX_DEPTH];
int depth = -1;

int main(void)
{
	/* 
	 * TABLE OF INSTRUCTIONS :^)
	 * 0    |    NOP
	 * 1	|	PUSH
	 * 2	|	POP
	 * 3	|	OUT
	 * 4	|	ADD
	 * 5	|	SUB 
	 * 6	|	MUL
	 * 7	|	DIV
	 * 8	|	DUP
	 * 9    |    AND
	 * 10   |    OR
	 * 100  |	JMP	
	 * 101  |	CMP
	 * 102  |	JNZ
	 * 103  |	JZ
	 */

	/* 
	 * ;TEST UNCONDITIONAL JUMP
	 * NOP
	 * PUSH 1
	 * PUSH 1
	 * PUSH 6
	 * JMP
	 * SUB
	 * ADD
	 * OUT
	 */
	/*
	add_instr(0, NIL);   
	add_instr(1, 1);     
	add_instr(1, 1);     
	add_instr(1, 6);     
	add_instr(100, NIL); 
	add_instr(5, NIL);   
	add_instr(4, NIL);   
	add_instr(3, NIL);   
	*/

	/* 
	 * ;TEST CONDITIONAL JUMP
	 * PUSH 0
	 * PUSH 1
	 * ADD
	 * OUT
	 * DUP
	 * PUSH 10
	 * CMP
	 * PUSH 1
	 * JMPZ
	 */
	/*
	add_instr(1, 0);
	add_instr(1, 1);
	add_instr(4, NIL);
	add_instr(3, NIL);
	add_instr(8, NIL);
	add_instr(1, 10);
	add_instr(101, NIL);
	add_instr(1, 1);
	add_instr(103, NIL);
    */

    /*
     * TEST ASSEMBLER
     */
    instr_to_code("PUSH 0");
    instr_to_code("PUSH 1");
    instr_to_code("ADD");
    instr_to_code("OUT");
    instr_to_code("DUP");
    instr_to_code("PUSH 10");
    instr_to_code("CMP");
    instr_to_code("PUSH 1");
    instr_to_code("JZ");

	/* Reset the instruction pointer after loading */
	ip = -1;

	while (ip < MAX_INSTR)
	{
		if (exec(instructions[ip], args[ip])) return 0;
		ip++;
		if (DEBUG_STACK) dump_stack();
	}    

    
    return 0;
}

void dump_stack(void)
{
    for(int i = 0; i <= depth; i++)
    {
        printf("%i ", stack[i]);
    }
    printf("\n");
}

void add_instr(int code, int arg1)
{
    printf("Added: %i %i\n", code, arg1);

	instructions[ip] = code;
	args[ip] = arg1;
	ip++;
}

void add_label(int addr)
{
    labels[lp] = addr;
    lp++;
}

int exec(int code, int arg1)
{
    int a = 0, b = 0;

    switch (code)
    {
        case 0: /* NOP */ ;

        break;
    
        case 1: if (DEBUG_INSTR) printf("PUSH %i\n", arg1);
            /* Push a value onto the stack */
            push(arg1);
        break;

        case 2: if (DEBUG_INSTR) printf("POP \n");
            /* Remove the top value. */
            pop();
        break;

        case 3: if (DEBUG_INSTR) printf("OUT \n");
            /* Print the top value on the stack */
            printf("%i\n", peek());
        break;

        case 4: if (DEBUG_INSTR) printf("ADD \n");
            /* Add the top two values and push result */
            a = pop();
            b = pop();
            push(a + b);
        break;

        case 5: if (DEBUG_INSTR) printf("SUB \n");
        	/* Subtract the second  value from the top value */
			a = pop();
			b = pop();
			push(a - b);			
        break;
        
        case 6: if (DEBUG_INSTR) printf("MUL \n");
            /* Multiply the top two values and push result */
            a = pop();
            b = pop();
            push(a * b);
        break;

		case 7: if (DEBUG_INSTR) printf("DIV \n");
        	/* Divide the top two values and push result */
            a = pop();
            b = pop();
            push(a / b);
        break;

        case 8: if (DEBUG_INSTR) printf("DUP \n");
        	/* Duplicate the top value on the stack. */
        	a = peek();
        	push(a);
        break;

        case 9: if (DEBUG_INSTR) printf("AND \n");
        	/* Bitwise AND the top two values. */
            a = pop();
        	b = pop();
        	push(a & b);
        break;

        case 10: if (DEBUG_INSTR) printf("OR \n");
        	/* Bitwise AND the top two values. */
            a = pop();
        	b = pop();
        	push(a | b);
        break;

		case 100: if (DEBUG_INSTR) printf("JMP \n");
			/* Unconditionally jump to address at top of stack. */;
			a = pop();
			jump(a);
		break;

		case 101: if (DEBUG_INSTR) printf("CMP \n");
			/* Compare top two values in stack, push 1 if same.  */
			a = pop();
			b = pop();
			a == b ? push(1) : push(0);
		break;

		case 102: if (DEBUG_INSTR) printf("JNZ \n");
			/* Jump to top if second value is nonzero. */
			a = pop();
			b = pop();
			if (b) {
				if (jump(a)) return NIL;
			}
		break;

		case 103: if (DEBUG_INSTR) printf("JZ \n");
			/* Jump to top if second value is zero. */
			a = pop();
			b = pop();
			if (!b) {
				if (jump(a)) return NIL;
			}
		break;
				
        default:
            printf("ERROR: Invalid instruction: %i\n", code);
            return NIL;
            break;
    }
    if (a == NIL || b == NIL) return NIL;
    return 0;
}

int instr_to_code(char* line)
{
    int i;

    i = 0;
    while (line[i] != ' ' && line[i] != '\0')
    {
        i++;
    }
    
    int length = i;

    /* Not a valid instruction. */
    if (length > MAX_INSTR_LEN)
    {
        printf("ERROR: Not a valid instruction: %s\n", line);
    } 

    /* Copy instruction only. */
    char instr[MAX_INSTR_LEN] = {0}; 
    for (i = 0; i < length; i++)
    {
        instr[i] = line[i];
    }
    instr[length] = '\0';
    /* printf("instr: %s\n", instr); */


    int start = length;
    i = start;
    /* Trim front of string */
    while(line[i] == ' ')
    {
        i++;
    }
    start = i;
    /* Get the argument */
    while (line[i] != '\n' && line[i] != '\r' && 
           line[i] != ';'  && line[i] != '\0' && line[i] != ' ')
    { 
        /* printf("%c", line[i]); */
        i++;
    }
    length = i;

    /* Copy argument */
    char arg[MAX_INSTR_LEN] = {0}; 
    for (i = start; i < length; i++)
    {
        arg[i - start] = line[i];
    }
    arg[length] = '\0';
    /* printf("start: %i, length: %i, arg: %s\n", start, length, arg); */

    /* Parse argument */
    int arg1 = NIL;
    if ((length - start) > 0)
    {
        arg1 = (int) strtol(arg, NULL, 10);
    }

    if (strcmp(instr, "NOP") == 0)
    {
        add_instr(0, arg1);
        return 0;
    }
    else if (strcmp(instr, "PUSH") == 0)
    {
        add_instr(1, arg1);
        return 1;
    }
    else if (strcmp(instr, "POP") == 0)
    {
        add_instr(2, arg1);
        return 2;
    }
    else if (strcmp(instr, "OUT") == 0)
    {
        add_instr(3, arg1);
        return 3;
    }
    else if (strcmp(instr, "ADD") == 0)
    {
        add_instr(4, arg1);
        return 4;
    }
    else if (strcmp(instr, "SUB") == 0)
    {
        add_instr(5, arg1);
        return 5;
    }
    else if (strcmp(instr, "MUL") == 0)
    {
        add_instr(6, arg1);
        return 6;
    }
    else if (strcmp(instr, "DIV") == 0)
    {
        add_instr(7, arg1);
        return 7;
    }
    else if (strcmp(instr, "DUP") == 0)
    {
        add_instr(8, arg1);
        return 8;
    }
    else if (strcmp(instr, "AND") == 0)
    {
        add_instr(9, arg1);
        return 9;
    }
    else if (strcmp(instr, "OR") == 0)
    {
        add_instr(10, arg1);
        return 10;
    }
    else if (strcmp(instr, "JMP") == 0)
    {
        add_instr(100, arg1);
        return 100;
    }
    else if (strcmp(instr, "CMP") == 0)
    {
        add_instr(101, arg1);
        return 101;
    }
    else if (strcmp(instr, "JNZ") == 0)
    {
        add_instr(102, arg1);
        return 102;
    }
    else if (strcmp(instr, "JZ") == 0)
    {
        add_instr(103, arg1);
        return 103;
    }

    return NIL; 
}

int jump(int addr)
{
	if (addr < MAX_INSTR)
	{
		/* Adjust addresses such that 0 gives the first instruction */
		ip = (addr-1); 
	}
	else 
	{
		printf("Error: Attempted to jump out of bounds: %i\n", addr);
		return NIL;
	}
	return 0;
}

void push(int x)
{
    if (depth < MAX_DEPTH)
    {
        depth++;
        stack[depth] = x;
    }
    else
    {
        printf("Stack is full.\n");
    }
}

int pop(void)
{
    if (depth != -1)
    {
        int x = stack[depth];
        depth--;
        return x;
    }
    else
    {
        printf("Stack is empty.\n");
        return NIL;
    }
}

int peek(void)
{
    if (depth != -1)
    {
        return stack[depth];   
    }
    else
    {
        printf("Stack is empty.\n");
        return NIL;
    }
}