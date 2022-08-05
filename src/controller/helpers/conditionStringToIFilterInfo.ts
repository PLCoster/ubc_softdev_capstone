import {
    IFilter,
    EQFilter,
    GTFilter,
    LTFilter,
    INCFilter,
    BEGFilter,
    ENDFilter,
} from "../filters";

/**
 * This file contains an object allowing translation from a query condition string
 * (e.g. 'is equal to') to the appropriate IFilter (e.g. EQFilter), as well as
 * the function that should be used to parse the condition value (e.g. '100') to
 * the correct type / trimmed string
 */

interface IFilterInfo {
    filter: new (...args: any) => IFilter;
    valueParser: (val: string) => number | string;
    negation: boolean;
}

// Helper function that removes quotes around query string value
const stringValueParser = (val: string) => val.slice(1, -1);

export const conditionStringToIFilterInfo: { [key: string]: IFilterInfo } = {
    "is equal to": {
        filter: EQFilter,
        valueParser: parseFloat,
        negation: false,
    },
    "is not equal to": {
        filter: EQFilter,
        valueParser: parseFloat,
        negation: true,
    },
    "is greater than": {
        filter: GTFilter,
        valueParser: parseFloat,
        negation: false,
    },
    "is not greater than": {
        filter: GTFilter,
        valueParser: parseFloat,
        negation: true,
    },
    "is less than": {
        filter: LTFilter,
        valueParser: parseFloat,
        negation: false,
    },
    "is not less than": {
        filter: LTFilter,
        valueParser: parseFloat,
        negation: true,
    },
    "is": {
        filter: EQFilter,
        valueParser: stringValueParser,
        negation: false,
    },
    "is not": {
        filter: EQFilter,
        valueParser: stringValueParser,
        negation: true,
    },
    "includes": {
        filter: INCFilter,
        valueParser: stringValueParser,
        negation: false,
    },
    "does not include": {
        filter: INCFilter,
        valueParser: stringValueParser,
        negation: true,
    },
    "begins with": {
        filter: BEGFilter,
        valueParser: stringValueParser,
        negation: false,
    },
    "does not begin with": {
        filter: BEGFilter,
        valueParser: stringValueParser,
        negation: true,
    },
    "ends with": {
        filter: ENDFilter,
        valueParser: stringValueParser,
        negation: false,
    },
    "does not end with": {
        filter: ENDFilter,
        valueParser: stringValueParser,
        negation: true,
    },
};
