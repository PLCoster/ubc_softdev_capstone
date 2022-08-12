/**
 * This file holds various RegExs in order to validate and parse a query string
 */

// RE for all possible courses column names
export const cColNameRE =
    /Average|Pass|Fail|Audit|Department|ID|Instructor|Title|UUID|Year/;

// RE for all possible rooms column names
const rColNameRE =
    /Full Name|Short Name|Number|Name|Address|Type|Furniture|Link|Latitude|Longitude|Seats/;

// RE relating to numerical data columns
const cNumColRE = /(?:Average|Pass|Fail|Audit|Year)/;
const rNumColRE = /(?:Latitude|Longitude|Seats)/;

const numberOPRE = /(?:is (?:not )?(?:greater than|less than|equal to))/;
const numberRE = /(?:(?:-)?(?:[1-9][0-9]*|0)(?:[.][0-9]+)?)/;

// REs for a numerical column filter condition
const cNumFilterRE = RegExp(
    `(?:${cNumColRE.source} ${numberOPRE.source} ${numberRE.source})`,
);
const rNumFilterRE = RegExp(
    `(?:${rNumColRE.source} ${numberOPRE.source} ${numberRE.source})`,
);

// RE relating to string data columns
const cStrColRE = /(?:Department|ID|Instructor|Title|UUID)/;
const rStrColRE =
    /(?:Full Name|Short Name|Number|Name|Address|Type|Furniture|Link)/;

const stringOPRE =
    /(?:is(?: not)?|includes|does not include|(?:begins|does not begin|ends|does not end) with)/;
const stringRE = /"(?:[^*"]*)"/;

// REs for a string column filter condition
const cStrFilterRE = RegExp(
    `(?:${cStrColRE.source} ${stringOPRE.source} ${stringRE.source})`,
);
const rStrFilterRE = RegExp(
    `(?:${rStrColRE.source} ${stringOPRE.source} ${stringRE.source})`,
);

// REs for a single filter condition (numerical condition or string condition)
const cOneFilterRE = RegExp(
    `(?:${cNumFilterRE.source}|${cStrFilterRE.source})`,
);
const rOneFilterRE = RegExp(
    `(?:${rNumFilterRE.source}|${rStrFilterRE.source})`,
);

// REs to capture DATASET section of query string
const cDatasetRE = /(?<DATASET>In courses dataset \S+)/;
const rDatasetRE = /(?<DATASET>In rooms dataset \S+)/;

// REs to capture FILTER section of query string
const cFilterRE = new RegExp(
    `(?<FILTER>find entries whose (?:${cOneFilterRE.source} (?:and|or) )*${cOneFilterRE.source}|find all entries)`,
);
const rFilterRE = new RegExp(
    `(?<FILTER>find entries whose (?:${rOneFilterRE.source} (?:and|or) )*${rOneFilterRE.source}|find all entries)`,
);

// REs to capture DISPLAY section of query string
const cDisplaySingleRE = new RegExp(`(?:${cColNameRE.source})`);
const cDisplayTwoRE = new RegExp(
    `(?:(:?${cColNameRE.source}) and (?:${cColNameRE.source}))`,
);
const cDisplayMultRE = new RegExp(
    `(?:(?:(?:${cColNameRE.source}), )+(?:${cColNameRE.source}) and (?:${cColNameRE.source}))`,
);

const rDisplaySingleRE = new RegExp(`(?:${rColNameRE.source})`);
const rDisplayTwoRE = new RegExp(
    `(?:(:?${rColNameRE.source}) and (?:${rColNameRE.source}))`,
);
const rDisplayMultRE = new RegExp(
    `(?:(?:(?:${rColNameRE.source}), )+(?:${rColNameRE.source}) and (?:${rColNameRE.source}))`,
);

const cDisplayRE = new RegExp(
    `(?<DISPLAY>${cDisplayMultRE.source}|${cDisplayTwoRE.source}|${cDisplaySingleRE.source})`,
);
const rDisplayRE = new RegExp(
    `(?<DISPLAY>${rDisplayMultRE.source}|${rDisplayTwoRE.source}|${rDisplaySingleRE.source})`,
);

// REs to capture ORDER section of query string
const cSingleOrderRE = new RegExp(`(?:${cColNameRE.source})`);
const rSingleOrderRE = new RegExp(`(?:${rColNameRE.source})`);

const cMultipleOrderRE = new RegExp(
    `(?:(?:${cColNameRE.source}), )*(?:${cColNameRE.source}) and (?:${cColNameRE.source})`,
);
const rMultipleOrderRE = new RegExp(
    `(?:(?:${rColNameRE.source}), )*(?:${rColNameRE.source}) and (?:${rColNameRE.source})`,
);

const cOrderRE = new RegExp(
    `(?<ORDER>sort in (?:ascending|descending) order by (?:${cMultipleOrderRE.source}|${cSingleOrderRE.source}))`,
);
const rOrderRE = new RegExp(
    `(?<ORDER>sort in (?:ascending|descending) order by (?:${rMultipleOrderRE.source}|${rSingleOrderRE.source}))`,
);

// REs to validate entire query and extract DATASET, FILTER, DISPLAY, ORDER
export const cQueryRE = new RegExp(
    `^${cDatasetRE.source}, ${cFilterRE.source}; show ${cDisplayRE.source}(?:; ${cOrderRE.source})?[.]$`,
);
export const rQueryRE = new RegExp(
    `^${rDatasetRE.source}, ${rFilterRE.source}; show ${rDisplayRE.source}(?:; ${rOrderRE.source})?[.]$`,
);

// RE to extract KIND and INPUT name from DATASET section of query
const cInputKindRE = /^In (?<KIND>courses) dataset (?<INPUT>\S+)$/;
const rInputKindRE = /^In (?<KIND>rooms) dataset (?<INPUT>\S+)$/;

// REs to extract CONDITION, VALUE and COLNAME from FILTER section of query
const filterConditionRE = new RegExp(
    `(?<CONDITION>${numberOPRE.source}|${stringOPRE.source})`,
);
const filterValueRE = new RegExp(
    `(?<VALUE>${numberRE.source}|${stringRE.source})`,
);

const cFilterDetailsRE = new RegExp(
    `^(?<COLNAME>${cColNameRE.source}) ${filterConditionRE.source} ${filterValueRE.source}$`,
);
const rFilterDetailsRE = new RegExp(
    `^(?<COLNAME>${rColNameRE.source}) ${filterConditionRE.source} ${filterValueRE.source}$`,
);

// REs to extract DIRECTION and COLNAME from ORDER section of query
const directionRE = /(?<DIRECTION>ascending|descending)/;

const cSortDirectionColRE = new RegExp(
    `^sort in ${directionRE.source} order by (?<COLNAMES>${cMultipleOrderRE.source}|${cSingleOrderRE.source})$`,
);
const rSortDirectionColRE = new RegExp(
    `^sort in ${directionRE.source} order by (?<COLNAMES>${rMultipleOrderRE.source}|${rSingleOrderRE.source})$`,
);

// RE for RESERVED strings (INPUT cannot be equal to any of these):
const keywordRE =
    /(In|dataset|find|all|show|and|or|sort|by|entries|is|the|of|whose|grouped|where)/;

export const reservedRE = new RegExp(
    `^${keywordRE.source}$|^${numberOPRE.source}$|^${stringOPRE.source}$`,
);

// Interface and implentations that contain relevant RegExs for Course/Room queries
export interface QuerySectionREs {
    colNameRE: RegExp;
    inputKindRE: RegExp;
    singleFilterRE: RegExp;
    filterDetailRE: RegExp;
    sortDirectionColRE: RegExp;
}

export const courseQuerySectionREs: QuerySectionREs = {
    colNameRE: cColNameRE,
    inputKindRE: cInputKindRE,
    singleFilterRE: cOneFilterRE,
    filterDetailRE: cFilterDetailsRE,
    sortDirectionColRE: cSortDirectionColRE,
};

export const roomsQuerySectionREs: QuerySectionREs = {
    colNameRE: rColNameRE,
    inputKindRE: rInputKindRE,
    singleFilterRE: rOneFilterRE,
    filterDetailRE: rFilterDetailsRE,
    sortDirectionColRE: rSortDirectionColRE,
};
