declare module 'classnames' {
  type ClassValue = string | number | boolean | undefined | null | ClassDictionary | ClassArray;

  interface ClassDictionary {
    [id: string]: any;
  }

  interface ClassArray extends Array<ClassValue> {}

  function classNames(...args: ClassValue[]): string;

  export = classNames;
}
