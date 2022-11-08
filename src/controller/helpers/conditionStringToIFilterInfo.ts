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
 * This file contains objects allowing translation from a query condition string
 * (e.g. 'is equal to') or key (e.g. 'IS') to the appropriate IFilter (e.g. EQFilter)
 * as well as the function that should be used to parse the condition value
 * (e.g. '100') to the correct type / trimmed string
 */

interface IFilterInfo {
    key: string;
    filter: new (...args: any) => IFilter;
    conditionType: "number" | "string";
    valueParser: (val: string) => number | string;
    negation: boolean;
}

// Helper function that removes quotes around query string value
const stringValueParser = (val: string) => val.slice(1, -1);

export const conditionStringToIFilterInfo: { [key: string]: IFilterInfo } = {
    "is equal to": {
        key: "EQ",
        filter: EQFilter,
        conditionType: "number",
        valueParser: parseFloat,
        negation: false,
    },
    "is not equal to": {
        key: "EQ",
        filter: EQFilter,
        conditionType: "number",
        valueParser: parseFloat,
        negation: true,
    },
    "is greater than": {
        key: "GT",
        filter: GTFilter,
        conditionType: "number",
        valueParser: parseFloat,
        negation: false,
    },
    "is not greater than": {
        key: "GT",
        filter: GTFilter,
        conditionType: "number",
        valueParser: parseFloat,
        negation: true,
    },
    "is less than": {
        key: "LT",
        filter: LTFilter,
        conditionType: "number",
        valueParser: parseFloat,
        negation: false,
    },
    "is not less than": {
        key: "LT",
        filter: LTFilter,
        conditionType: "number",
        valueParser: parseFloat,
        negation: true,
    },
    "is": {
        key: "IS",
        filter: EQFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: false,
    },
    "is not": {
        key: "IS",
        filter: EQFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: true,
    },
    "includes": {
        key: "INC",
        filter: INCFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: false,
    },
    "does not include": {
        key: "INC",
        filter: INCFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: true,
    },
    "begins with": {
        key: "BEG",
        filter: BEGFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: false,
    },
    "does not begin with": {
        key: "BEG",
        filter: BEGFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: true,
    },
    "ends with": {
        key: "END",
        filter: ENDFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: false,
    },
    "does not end with": {
        key: "END",
        filter: ENDFilter,
        conditionType: "string",
        valueParser: stringValueParser,
        negation: true,
    },
};

export const conditionKeyToIFilterInfo: { [key: string]: IFilterInfo } = {
    EQ: conditionStringToIFilterInfo["is equal to"],
    GT: conditionStringToIFilterInfo["is greater than"],
    LT: conditionStringToIFilterInfo["is less than"],
    IS: conditionStringToIFilterInfo["is"],
    INC: conditionStringToIFilterInfo["includes"],
    BEG: conditionStringToIFilterInfo["begins with"],
    END: conditionStringToIFilterInfo["ends with"],
};
