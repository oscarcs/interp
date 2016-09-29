#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define NIL 9920901
#define MAX_DEPTH 100
#define MAX_INSTR 200
#define MAX_LINE_LEN 81

#define DEBUG_INSTR 0
#define DEBUG_STACK 0
#define DEBUG_ASSEMBLER 0
#define DEBUG_LABELS 0
#define DEBUG_NO_OUTPUT 0

void dump_stack(void);
void add_instr(int pos, int code, int arg1);
void add_label(int addr, char* name);
int exec(int code, int arg1);
/* Loader-specific: */
void load_asm(char* filename);
void load_labels(void);
void load_labelrefs(void);
void load_instrs(void);
/* Lexical Analysis: */
int is_label(char* line);
int is_labelref(char* line);
int is_instr(char* line);
int is_blank(char* line);
int is_terminating(char x);
void upper_str(char* str);
/* Assembler-specific: */
int labelref_to_addr(char* label_name);
int instr_to_code(int pos, char* line);
/* Instruction-specific: */
int jump(int addr);
int push(int x);
int pop(void);
int peek(void);
/* Exceptions: */
void throw_err(char* msg);

int break_exec = 0;
int ip = 0; /* Instruction pointer */
int lp = 0; /* Label pointer */
char lines[MAX_INSTR][MAX_LINE_LEN] = {0};
int num_lines = 0;
int instructions[MAX_INSTR] = {0};
int args[MAX_INSTR] = {0};
int labels[MAX_INSTR] = {NIL};
char label_names[MAX_INSTR][MAX_LINE_LEN] = {0};
int stack[MAX_DEPTH];
int depth = -1;

int main(int argc, char **argv)
{
    /*
     * TABLE OF INSTRUCTIONS :^)
     * 0    |   NOP
     * 1    |   PUSH
     * 2    |   POP
     * 3    |   OUT
     * 4    |   COUT
     * 5    |   ADD
     * 6    |   SUB
     * 7    |   MUL
     * 8    |   DIV
     * 9    |   DUP
     * 10   |   AND
     * 11   |   OR
     * 12   |   CALL
     * 13   |   RET
     * 100  |   JMP
     * 101  |   CMP
     * 102  |   JNZ
     * 103  |   JZ
     */

    if (argc < 2)
    {
        printf("Interp: Provide a filename to load.\n");
        return 0;
    }
    load_asm(argv[1]);

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

void add_instr(int pos, int code, int arg1)
{
    if (ip < MAX_INSTR)
    {
        if (DEBUG_INSTR)
        {
            char chararg[20] = {0};
            arg1 == NIL ? sprintf(chararg, " ") : sprintf(chararg, "%i", arg1);
            printf("Added: %i (%s) at %i\n", code, chararg, pos);
        }

        instructions[pos] = code;
        args[pos] = arg1;
    }
    else
    {
        char err[80];
        sprintf(err, "Error: Max number of instructions exceeded: %i\n", ip);
        throw_err(err);
    }
}

void add_label(int addr, char* name)
{
    if (lp < MAX_INSTR)
    {
        if (DEBUG_LABELS) printf("Label: '%s' (%i) is %i.\n", name, lp, addr);
        labels[lp] = addr;
        strcpy(label_names[lp], name);
        lp++;
    }
    else
    {
        char err[80];
        sprintf(err, "Error: Max number of labels exceeded: %i\n", lp);
        throw_err(err);
    }
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
            /* Print the top value on the stack. */
            if (!DEBUG_NO_OUTPUT) printf("%i", peek());
        break;

        case 4: if (DEBUG_INSTR) printf("COUT \n");
            /* Print the top value on the stack as a char. */
            if (!DEBUG_NO_OUTPUT) printf("%c", peek());
        break;

        case 5: if (DEBUG_INSTR) printf("ADD \n");
            /* Add the top two values and push result. */
            a = pop();
            b = pop();
            push(a + b);
        break;

        case 6: if (DEBUG_INSTR) printf("SUB \n");
            /* Subtract the second  value from the top value. */
            a = pop();
            b = pop();
            push(a - b);
        break;

        case 7: if (DEBUG_INSTR) printf("MUL \n");
            /* Multiply the top two values and push result. */
            a = pop();
            b = pop();
            push(a * b);
        break;

        case 8: if (DEBUG_INSTR) printf("DIV \n");
            /* Divide the top two values and push result. */
            a = pop();
            b = pop();
            push(a / b);
        break;

        case 9: if (DEBUG_INSTR) printf("DUP \n");
            /* Duplicate the top value on the stack. */
            a = peek();
            push(a);
        break;

        case 10: if (DEBUG_INSTR) printf("AND \n");
            /* Bitwise AND the top two values. */
            a = pop();
            b = pop();
            push(a & b);
        break;

        case 11: if (DEBUG_INSTR) printf("OR \n");
            /* Bitwise AND the top two values. */
            a = pop();
            b = pop();
            push(a | b);
        break;

        case 12: if (DEBUG_INSTR) printf("CALL \n");
            /* Call a subroutine */
            a = pop();
            push(ip);
            jump(a);
        break;

        case 13: if (DEBUG_INSTR) printf("RET \n");
            /* Pop the caller address off the stack and return there */
            a = pop();
            jump(a + 1); /* Jump past the call instruction */
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

        default: /* a statement! */ ;
            char err[80];
            sprintf(err, "ERROR: Invalid instruction: %i\n", code);
            throw_err(err);

            return NIL;
        break;
    }
    if (break_exec) return NIL;
    return 0;
}

void load_asm(char* filename)
{
    FILE *fp;
    fp = fopen(filename, "r");
    if (fp != NULL)
    {
        int i = 0;
        while (1)
        {
            char line[MAX_LINE_LEN];
            if (fgets(line, 150, fp) == NULL) break;

            strcpy(lines[i], line);
            i++;
        }
        num_lines = i;

        load_labels();
        load_labelrefs();
        load_instrs();
    }
    else
    {
        char err[80];
        sprintf(err, "Error: File '%s' not found.\n", filename);
        throw_err(err);
    }
}

void load_labels(void)
{
    ip = 0;
    for (int i = 0; i < num_lines; i++)
    {
        char line[MAX_LINE_LEN] = {0};
        strcpy(line, lines[i]);

        if (is_label(line))
        {

            /* @TODO: Move this into own function using heap. */
            char name[MAX_LINE_LEN] = {0};
            int i = 0;
            int start = 0;
            int length = 0;
            {
                /* Trim front of string */
                while (line[i] == ' ' || line[i] == '\t')
                {
                    i++;
                }
                start = i;

                /* Get the name */
                while (!is_terminating(line[i]) && line[i] != ':')
                {
                    i++;
                }
                length = i;

                /* Copy name */
                for (i = start; i < length; i++)
                {
                    name[i - start] = line[i];
                }
                name[length] = '\0';
            }

            add_label(ip, name);
        }

        if (!is_blank(line)) ip++;
    }
}

void load_labelrefs(void)
{
    ip = 0;
    for (int i = 0; i < num_lines; i++)
    {
        char line[MAX_LINE_LEN] = {0};
        strcpy(line, lines[i]);

        if (is_labelref(line))
        {
            /* TODO: Move this into own function using heap. */
            char name[MAX_LINE_LEN] = {0};
            int i = 0;
            int start = 0;
            int length = 0;
            {
                /* Trim front of string */
                while (line[i] == ' ' || line[i] == '\t' || line[i] == '@')
                {
                    i++;
                }
                start = i;

                /* Get the name */
                while (!is_terminating(line[i]))
                {
                    i++;
                }
                length = i;

                /* Copy name */
                for (i = start; i < length; i++)
                {
                    name[i - start] = line[i];
                }
                name[length] = '\0';
            }

            int addr = labelref_to_addr(name);
            add_instr(ip, 1, addr);
        }

        if (!is_blank(line)) ip++;
    }
}

void load_instrs(void)
{
    ip = 0;
    for (int i = 0; i < num_lines; i++)
    {
        char line[MAX_LINE_LEN] = {0};
        strcpy(line, lines[i]);

        instr_to_code(ip, line);

        if (!is_blank(line)) ip++;
    }
}

int is_label(char* line)
{
    int i = 0;
    while (!is_terminating(line[i]))
    {
        if (line[i] == ':') return 1;
        i++;
    }
    return 0;
}

int is_labelref(char* line)
{
    int i = 0;
    while (!is_terminating(line[i]))
    {
        if (line[i] == '@') return 1;
        i++;
    }
    return 0;
}

int is_instr(char* line)
{
    /* @OPTIMIZATION */
    /* @TODO: Use a more general check */
    return !is_label(line) && !is_labelref(line);
}

int is_blank(char* line)
{
    int i = 0;
    while (!is_terminating(line[i]))
    {
        if (line[i] != ' ' || line[i] != '\t') return 0;
        i++;
    }
    return 1;
}

int is_terminating(char x)
{
    return (x == '\n') || (x == '\r') ||
           (x == ';')  || (x == '\0');
}

void upper_str(char* str)
{
    for (int i = 0; str[i]; i++)
    {
        str[i] = toupper(str[i]);
    }
}

int labelref_to_addr(char* label_name)
{
    int addr = NIL;
    char* cur;
    for (int i = 0; i < lp; i++)
    {
        cur = label_names[i];
        if (strcmp(cur, label_name) == 0)
        {
            addr = labels[i];
            break;
        }
    }
    if (DEBUG_LABELS) printf("'%s' addr: %i\n", label_name, addr);
    return addr;
}

int instr_to_code(int pos, char* line)
{
    int i = 0;
    int length = 0;
    int start = 0;

    char instr[MAX_LINE_LEN] = {0};
    {
        /* Trim front of string */
        while (line[i] == ' ' || line[i] == '\t')
        {
            i++;
        }
        start = i;

        /* Get the instruction */
        while (!is_terminating(line[i]) && line[i] != ' ')
        {
            i++;
        }
        length = i;

        /* Not a valid instruction! */
        if (length > MAX_LINE_LEN)
        {
            char err[80];
            sprintf(err, "ERROR: Not a valid instruction: '%s'\n", line);
            throw_err(err);
        }

        /* Copy instruction */
        for (i = start; i < length; i++)
        {
            instr[i - start] = line[i];
        }
        instr[length] = '\0';
        if (DEBUG_ASSEMBLER) printf("Instr: %s\n", instr);
    }

    start = length;
    i = start;
    char arg[MAX_LINE_LEN] = {0}; 
    {
        /* Trim front of string */
        while (line[i] == ' ' || line[i] == '\t')
        {
            i++;
        }
        start = i;

        /* Get the argument */
        while (!is_terminating(line[i]))
        {
            i++;
        }
        length = i;

        /* Copy argument */
        for (i = start; i < length; i++)
        {
            arg[i - start] = line[i];
        }
        arg[length] = '\0';
        if (DEBUG_ASSEMBLER) printf("Arg: %s\n", arg);
    }

    /* Parse argument */
    int arg1 = NIL;
    if ((length - start) > 0)
    {
        arg1 = (int) strtol(arg, NULL, 10);
    }

    upper_str(instr);
    
    /*
     * @OPTIMIZATION
     * Instruction comparison ladder. Could be replaced with length or
     * first character-based comparison for speed.
     */
    if (strcmp(instr, "NOP") == 0)
    {
        add_instr(pos, 0, arg1);
        return 0;
    }
    else if (strcmp(instr, "PUSH") == 0)
    {
        add_instr(pos, 1, arg1);
        return 1;
    }
    else if (strcmp(instr, "POP") == 0)
    {
        add_instr(pos, 2, arg1);
        return 2;
    }
    else if (strcmp(instr, "OUT") == 0)
    {
        add_instr(pos, 3, arg1);
        return 3;
    }
    else if (strcmp(instr, "COUT") == 0)
    {
        add_instr(pos, 4, arg1);
        return 4;
    }
    else if (strcmp(instr, "ADD") == 0)
    {
        add_instr(pos, 5, arg1);
        return 5;
    }
    else if (strcmp(instr, "SUB") == 0)
    {
        add_instr(pos, 6, arg1);
        return 6;
    }
    else if (strcmp(instr, "MUL") == 0)
    {
        add_instr(pos, 7, arg1);
        return 7;
    }
    else if (strcmp(instr, "DIV") == 0)
    {
        add_instr(pos, 8, arg1);
        return 8;
    }
    else if (strcmp(instr, "DUP") == 0)
    {
        add_instr(pos, 9, arg1);
        return 9;
    }
    else if (strcmp(instr, "AND") == 0)
    {
        add_instr(pos, 10, arg1);
        return 10;
    }
    else if (strcmp(instr, "OR") == 0)
    {
        add_instr(pos, 11, arg1);
        return 11;
    }
    else if (strcmp(instr, "CALL") == 0)
    {
        add_instr(pos, 12, arg1);
        return 12;
    }
    else if (strcmp(instr, "RET") == 0)
    {
        add_instr(pos, 13, arg1);
        return 13;
    }
    else if (strcmp(instr, "JMP") == 0)
    {
        add_instr(pos, 100, arg1);
        return 100;
    }
    else if (strcmp(instr, "CMP") == 0)
    {
        add_instr(pos, 101, arg1);
        return 101;
    }
    else if (strcmp(instr, "JNZ") == 0)
    {
        add_instr(pos, 102, arg1);
        return 102;
    }
    else if (strcmp(instr, "JZ") == 0)
    {
        add_instr(pos, 103, arg1);
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
        char err[80];
        sprintf(err, "Error: Attempted to jump out of bounds: %i\n", addr);
        throw_err(err);
        return NIL;
    }
    return 0;
}

int push(int x)
{
    if (depth < MAX_DEPTH)
    {
        depth++;
        stack[depth] = x;
        return depth;
    }
    else
    {
        throw_err("Error: Stack overflow occurred.\n");
        return NIL;
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
        throw_err("Error: Stack is empty.\n");
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
        throw_err("Error: Stack is empty.\n");
        return NIL;
    }
}

void throw_err(char* msg)
{
    printf("%s", msg);
    break_exec = 1;
}
