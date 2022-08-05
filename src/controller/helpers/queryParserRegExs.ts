/**
 * This file holds various RegExs in order to validate and parse a query string
 */

// RE for all possible column names
export const columnNameRE =
    /Average|Pass|Fail|Audit|Department|ID|Instructor|Title|UUID/;

// RE relating to numerical data columns
const numberColRE = /(?:Average|Pass|Fail|Audit)/;
const numberOPRE = /(?:is (?:not )?(?:greater than|less than|equal to))/;
const numberRE = /(?:(?:-)?(?:[1-9][0-9]*|0)(?:[.][0-9]+)?)/;

// RE for a numerical column filter condition
const numberFilterRE = RegExp(
    `(?:${numberColRE.source} ${numberOPRE.source} ${numberRE.source})`,
);

// RE relating to string data columns
const stringColRE = /(?:Department|ID|Instructor|Title|UUID)/;
const stringOPRE =
    /(?:is(?: not)?|includes|does not include|(?:begins|does not begin|ends|does not end) with)/;
const stringRE = /"(?:[^*"]*)"/;

// RE for a string column filter condition
const stringFilterRE = RegExp(
    `(?:${stringColRE.source} ${stringOPRE.source} ${stringRE.source})`,
);

// RE for a single filter condition (numerical condition or string condition)
export const singleFilterRE = RegExp(
    `(?:${numberFilterRE.source}|${stringFilterRE.source})`,
);

// RE to capture DATASET section of query string
const datasetRE = /(?<DATASET>In (?:courses|rooms) dataset [a-zA-Z0-9]+)/;

// RE to capture FILTER section of query string
const filterRE = new RegExp(
    `(?<FILTER>find entries whose (?:${singleFilterRE.source} (?:and|or) )*${singleFilterRE.source}|find all entries)`,
);

const displaySingleRE = new RegExp(`(?:${columnNameRE.source})`);
const displayTwoRE = new RegExp(
    `(?:(:?${columnNameRE.source}) and (?:${columnNameRE.source}))`,
);
const displayMultRE = new RegExp(
    `(?:(?:(?:${columnNameRE.source}), )+(?:${columnNameRE.source}) and (?:${columnNameRE.source}))`,
);

// RE to capture DISPLAY section of query string
const displayRE = new RegExp(
    `(?<DISPLAY>${displayMultRE.source}|${displayTwoRE.source}|${displaySingleRE.source})`,
);

// RE to capture ORDER section of query string
const orderRE = new RegExp(
    `(?<ORDER>sort in (?:ascending|descending) order by (?:${columnNameRE.source}))`,
);

// RE to validate entire query and extract DATASET, FILTER, DISPLAY, ORDER
export const queryRE = new RegExp(
    `^${datasetRE.source}, ${filterRE.source}; show ${displayRE.source}(?:; ${orderRE.source})?[.]$`,
);

const keywordRE =
    /In|dataset|find|all|show|and|or|sort|by|entries|is|the|of|whose/;

// RE to extract KIND and INPUT name from DATASET section of query
export const inputKindRE = /^In (?<KIND>courses|rooms) dataset (?<INPUT>\S+)$/;

// RE to extract CONDITION, VALUE and COLNAME from FILTER section of query
const filterConditionRE = new RegExp(
    `(?<CONDITION>${numberOPRE.source}|${stringOPRE.source})`,
);
const filterValueRE = new RegExp(
    `(?<VALUE>${numberRE.source}|${stringRE.source})`,
);
export const filterDetailsRE = new RegExp(
    `^(?<COLNAME>${columnNameRE.source}) ${filterConditionRE.source} ${filterValueRE.source}$`,
);

// RE to extract DIRECTION and COLNAME from ORDER section of query
export const sortDirectionColRE = new RegExp(
    `^sort in (?<DIRECTION>ascending) order by (?<COLNAME>${columnNameRE.source})$`,
);
