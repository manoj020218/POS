import { useCallback, useState } from 'react';

export type CalculatorOperator = '+' | '-' | '×' | '÷';

type CalculatorState = {
  display: string;
  expression: string;
  operator: CalculatorOperator | null;
  overwrite: boolean;
  previousValue: number | null;
};

const initialState: CalculatorState = {
  display: '0',
  expression: '',
  operator: null,
  overwrite: true,
  previousValue: null
};

const formatResult = (value: number) => {
  if (!Number.isFinite(value)) {
    return 'Error';
  }
  return String(Number(value.toPrecision(12)));
};

const applyOperator = (left: number, right: number, operator: CalculatorOperator) => {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '×':
      return left * right;
    case '÷':
      return right === 0 ? Number.NaN : left / right;
    default:
      return right;
  }
};

export const useCalculator = () => {
  const [state, setState] = useState(initialState);

  const inputDigit = useCallback((digit: string) => {
    setState((current) => {
      if (current.overwrite) {
        return {
          ...current,
          display: digit,
          expression: current.operator === null ? '' : current.expression,
          overwrite: false
        };
      }
      if (current.display === '0') {
        return { ...current, display: digit };
      }
      return { ...current, display: current.display + digit };
    });
  }, []);

  const inputDecimal = useCallback(() => {
    setState((current) => {
      if (current.overwrite) {
        return {
          ...current,
          display: '0.',
          expression: current.operator === null ? '' : current.expression,
          overwrite: false
        };
      }
      return current.display.includes('.') ? current : { ...current, display: `${current.display}.` };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((current) => {
      if (current.overwrite) {
        return current;
      }
      const next = current.display.slice(0, -1);
      return { ...current, display: next.length === 0 ? '0' : next };
    });
  }, []);

  const clear = useCallback(() => setState(initialState), []);

  const setOperator = useCallback((operator: CalculatorOperator) => {
    setState((current) => {
      const value = Number(current.display);
      if (current.previousValue !== null && current.operator && !current.overwrite) {
        const result = applyOperator(current.previousValue, value, current.operator);
        return {
          display: formatResult(result),
          expression: `${formatResult(result)} ${operator}`,
          operator,
          overwrite: true,
          previousValue: result
        };
      }
      return { ...current, expression: `${current.display} ${operator}`, operator, overwrite: true, previousValue: value };
    });
  }, []);

  const equals = useCallback(() => {
    setState((current) => {
      if (current.operator === null || current.previousValue === null) {
        return current;
      }
      const result = applyOperator(current.previousValue, Number(current.display), current.operator);
      return {
        display: formatResult(result),
        expression: `${current.expression} ${current.display} =`,
        operator: null,
        overwrite: true,
        previousValue: null
      };
    });
  }, []);

  return {
    backspace,
    clear,
    display: state.display,
    equals,
    expression: state.expression,
    inputDecimal,
    inputDigit,
    setOperator
  };
};
