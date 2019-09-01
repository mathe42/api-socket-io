type validator = (value: any) => true | string;
export interface param {
  valiatoren: Array<validator>;
}



class baseValidator implements param {
  constructor(protected paramName: string) {}
  valiatoren: Array<validator> = []

  protected isType(type: string) {
    this.valiatoren.push(val => typeof val === type ? true : `${this.paramName} muss ein ${type} sein - vermutlich fehler im Programm`)
    return this
  }

  notNull() {
    this.valiatoren.push(val => val !== null ? true : `${this.paramName} darf nicht null sein!`)
    return this
  }

  notUndefined() {
    this.valiatoren.push(val => val !== undefined ? true : `${this.paramName} darf nicht undefined sein!`)
    return this
  }
  notFalsey(name: string) {
    this.valiatoren.push(val => !!val ? true : `${this.paramName} darf nicht ${name} sein!`)
    return this
  }
}

export class stringValidator extends baseValidator {
  required() {
    return this.notUndefined().notNull().isType('string')
  }

  minLength(len: number) {
    this.valiatoren.push((v: string | null | undefined) =>
      typeof v !== 'string' ? true : (v.length >= len ? true : `${this.paramName} muss minimal ${len} Zeichen lang sein.`)
    );
    return this;
  }

  maxLength(len: number) {
    this.valiatoren.push((v: string | null | undefined) =>
      typeof v !== 'string' ? true : (v.length <= len ? true : `${this.paramName} muss maximal ${len} Zeichen lang sein.`)
    );
    return this;
  }

  exactLength(len: number) {
    return this.minLength(len).maxLength(len)
  }

  enum(els:Array<string>) {
    this.valiatoren.push((v:string)=>els.indexOf(v)!==-1?true:`${this.paramName} darf nur bestimmte Werte anehmen.`)
    return this
  }

  numeric() {
    return this.regex(/^\d+$/, p=>`${p} muss numerisch sein.`)
  }

  email() {
    return this.regex(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i, p=>`${p} muss eine E-Mail sein.`)
  }

  regex(regex: RegExp, f: (p:string) => string) {
    this.valiatoren.push((v:string|null|undefined)=>regex.test(v)?true:f(this.paramName))
    return this
  }

  isDate() {
    // TODO:
    return this
  }
}

export class numberValidator extends baseValidator {
  required() {
    return this.notUndefined().notNull().isType('number')
  }
  ganz() {
    this.valiatoren.push((val: number) => {
      return Math.floor(val) === val
        ? true
        : `${this.paramName} muss eine ganze Zahl sein.`;
    });
    return this;
  }
  max(x: number) {
    this.valiatoren.push((val: number) => {
      return x >= val ? true : `${this.paramName} muss kleiner sein als ${x}.`;
    });
    return this;
  }
  min(x: number) {
    this.valiatoren.push((val: number) => {
      return x <= val ? true : `${this.paramName} muss größer sein als ${x}.`;
    });
    return this;
  }

  dez(sig:number, dezimal:number) {
    // TODO:
    return this
  }
}

export class booleanValidator extends baseValidator {
  required() {
    return this.notUndefined().notNull().isType('boolean')
  }

  private isX(value: boolean) {
    this.valiatoren.push((val: boolean) => {
      return value === val ? true : `${this.paramName} muss ${value} sein.`;
    });
    return this;
  }
  isTrue() {
    return this.isX(true);
  }
  isFalse() {
    return this.isX(false);
  }
}
