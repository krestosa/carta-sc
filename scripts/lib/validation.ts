export interface ValidationReporter {
  readonly errors: readonly string[];
  fail(message: string): void;
  check(condition: unknown, message: string): void;
  finish(failureHeading: string, successMessage: string): void;
}

export function createValidationReporter(): ValidationReporter {
  const errors: string[] = [];

  return {
    get errors() {
      return errors;
    },

    fail(message: string): void {
      errors.push(message);
    },

    check(condition: unknown, message: string): void {
      if (!condition) errors.push(message);
    },

    finish(failureHeading: string, successMessage: string): void {
      if (errors.length === 0) {
        console.log(successMessage);
        return;
      }

      console.error(`${failureHeading} with ${errors.length} issue(s):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    },
  };
}
