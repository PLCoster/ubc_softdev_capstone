import * as fs from "fs";
import * as path from "path";

import {
    InsightResponse,
    InsightDatasetKind,
    InsightAggregatorKind,
    InsightASTQueryOrderObject,
    InsightASTQueryOrderDir,
    InsightASTQuery,
} from "../IInsightFacade";

import { QuerySectionREs } from "./queryParserRegExs";

import Log from "../../Util";

import {
    cQueryRE,
    rQueryRE,
    reservedRE,
    courseQuerySectionREs,
    roomsQuerySectionREs,
} from "./queryParserRegExs";
import {
    conditionStringToIFilterInfo,
    conditionKeyToIFilterInfo,
} from "./conditionStringToIFilterInfo";
import { queryAggNameToIAggregatorInfo } from "./queryAggNameToIAggregatorInfo";
import {
    queryColNameStrToKeyStr,
    strQueryColNamesToKeyAndType,
} from "./columnKeyInfo";

// This class translates a valid query string into an Query AST Object
// Used to translate tests previously written for string queries to AST Queries
// SEE DRIVER SCRIPT BELOW
export default class StringQueryToASTQueryTranslator {
    constructor() {
        Log.trace("StringQueryToASTQueryTranslator::init()");
    }

    public translateQuery(queryStr: string): InsightASTQuery {
        // Try to match queryStr as valid courses or rooms dataset query
        let queryMatchObj: RegExpMatchArray;
        let querySectionREs: QuerySectionREs;
        if (cQueryRE.test(queryStr)) {
            queryMatchObj = queryStr.match(cQueryRE);
            querySectionREs = courseQuerySectionREs;
        } else if (rQueryRE.test(queryStr)) {
            queryMatchObj = queryStr.match(rQueryRE);
            querySectionREs = roomsQuerySectionREs;
        } else {
            // No matches for courses or rooms query - invalid query
            this.rejectQuery(`Invalid Query: incorrect query syntax`);
        }

        const {
            groups: {
                DATASET: datasetStr,
                FILTER: filterStr,
                GROUPBY: groupStr,
                APPLY: applyStr,
                DISPLAY: displayStr,
                ORDER: orderStr,
            },
        } = queryMatchObj;

        // Parse DATASET, FILTER(S), DISPLAY and ORDER sections of query
        const { id: ID, kind: KIND } = this.parseDataset(
            datasetStr,
            querySectionREs,
        );
        const WHERE = this.parseFilter(filterStr, ID, querySectionREs);

        const COLUMNS = this.parseDisplayOrGroupby(
            displayStr,
            ID,
            querySectionREs,
            groupStr ? true : false,
            false,
        );

        const queryAST: InsightASTQuery = {
            ID,
            KIND,
            WHERE,
            OPTIONS: { COLUMNS },
        };

        if (groupStr) {
            queryAST.TRANSFORMATIONS = {
                GROUP: this.parseDisplayOrGroupby(
                    groupStr,
                    ID,
                    querySectionREs,
                    true,
                    true,
                ),
            };
        }

        if (applyStr) {
            if (!groupStr) {
                this.rejectQuery(`APPLY is only possible for GROUPBY queries`);
            }

            queryAST.TRANSFORMATIONS.APPLY = this.parseApply(
                applyStr,
                ID,
                querySectionREs,
            );
        }

        if (orderStr) {
            queryAST.OPTIONS.ORDER = this.parseOrder(
                orderStr,
                ID,
                COLUMNS,
                querySectionREs,
            );
        }

        this.validateQueryAST(queryAST);
        return queryAST;
    }

    // Extracts Dataset INPUT(id) and KIND from query string
    private parseDataset(
        datasetStr: string,
        querySectionREs: QuerySectionREs,
    ): {
        id: string;
        kind: InsightDatasetKind;
    } {
        const datasetMatchObj = datasetStr.match(querySectionREs.inputKindRE);

        if (!datasetMatchObj) {
            this.rejectQuery(
                "Invalid Query: DATASET KIND or INPUT not recognised",
            );
        }

        const id: string = datasetMatchObj.groups.INPUT;
        const kind = datasetMatchObj.groups.KIND as InsightDatasetKind;

        // Ensure that dataset id does not contain underscore char or is RESERVED string
        if (id.includes("_") || reservedRE.test(id)) {
            this.rejectQuery(
                `Invalid Query: DATASET INPUT (${id}) cannot contain underscore or equal RESERVED strings`,
            );
        }

        return { id, kind };
    }

    // Extracts FILTER(s) from query string, builds AST for filters:
    private parseFilter(
        filterStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
    ): any {
        if (filterStr === "find all entries") {
            return {};
        }

        // Otherwise at least one query filter is specified
        // Trim off 'find entries whose ' from start of filterStr
        filterStr = filterStr.slice(19);

        // Determine number of filters present:
        const filterOperatorArr = filterStr
            .split(
                new RegExp(`(${querySectionREs.singleFilterRE.source}|and|or)`),
            )
            .filter((str) => str.length > 1);

        if (!filterOperatorArr.length) {
            this.rejectQuery(
                `Invalid Query: could not parse FILTER section correctly`,
            );
        }

        // Build and Return Filter
        return this.buildFilters(
            filterOperatorArr,
            id,
            filterOperatorArr.length - 1,
            querySectionREs,
        );
    }

    // Extracts DISPLAY or GROUPBY keys from query string:
    private parseDisplayOrGroupby(
        sectionStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
        hasGroupBy: boolean,
        parseGroupBy: boolean,
    ): string[] {
        const sectionColNames = sectionStr.split(/, | and /);
        const numCols = sectionColNames.length;

        const sectionCols = new Set<string>();

        sectionColNames.forEach((colName) => {
            // Check Column Name is valid, (existing column or valid AGG column name)
            if (querySectionREs.colNameRE.test(colName)) {
                // Valid normal column name
                sectionCols.add(`${id}_${queryColNameStrToKeyStr[colName]}`);
            } else {
                // GROUPBY section cannot contain custom aggregator names
                if (parseGroupBy) {
                    this.rejectQuery(
                        `Invalid column name in GROUPBY: ${colName}`,
                    );
                }

                // DISPLAY section cannot contain custom names when no GROUPBY section
                if (!parseGroupBy && !hasGroupBy) {
                    this.rejectQuery(
                        `Invalid column name in DISPLAY: ${colName}`,
                    );
                }

                // DISPLAY Section can contain allowed APPLY aggregator names
                if (
                    colName.includes("_") ||
                    colName.includes(" ") ||
                    reservedRE.test(colName)
                ) {
                    // Invalid APPLY column name
                    this.rejectQuery(
                        `APPLY column names must not contain "_", " " or RESERVED, found ${colName}`,
                    );
                }
                sectionCols.add(colName);
            }
        });

        // If we have no column names, to display then throw an error:
        if (!sectionCols.size) {
            this.rejectQuery(
                `Invalid Query: invalid DISPLAY/GROUPBY, no column names specified "${sectionStr}"`,
            );
        }

        return Array.from(sectionCols);
    }

    // Extracts ORDER from query string
    private parseOrder(
        orderStr: string,
        id: string,
        displayKeys: string[],
        querySectionREs: QuerySectionREs,
    ): { dir: InsightASTQueryOrderDir; keys: string[] } {
        const orderMatchObj = orderStr.match(
            querySectionREs.sortDirectionColRE,
        );

        if (!orderMatchObj) {
            this.rejectQuery(`Invalid ORDER query section: ${orderStr}`);
        }

        const ordering =
            orderMatchObj.groups.DIRECTION === "ascending"
                ? InsightASTQueryOrderDir.UP
                : InsightASTQueryOrderDir.DOWN;

        // Extract valid DataObj keys or custom Agg keys from query ORDER column names
        const orderKeys = orderMatchObj.groups.COLNAMES.split(/, | and /).map(
            (colName) => {
                if (querySectionREs.colNameRE.test(colName)) {
                    return `${id}_${queryColNameStrToKeyStr[colName]}`;
                } else {
                    // Custom Aggregator Name for Ordering
                    if (
                        colName.includes("_") ||
                        colName.includes(" ") ||
                        reservedRE.test(colName)
                    ) {
                        // Invalid APPLY column name
                        this.rejectQuery(
                            `APPLY column names must not contain "_", " " or RESERVED, found ${colName} in ORDER`,
                        );
                    }
                    return colName;
                }
            },
        );

        // Check query semantics - we can only sort by a key that is being displayed:
        // !!! We should not have multiple identical order keys (? Not in UI SPEC)
        const orderKeySet = new Set<string>();
        orderKeys.forEach((orderKey) => {
            if (!displayKeys.includes(orderKey)) {
                this.rejectQuery(
                    `Invalid ORDER semantics - column ${orderKey} not selected in DISPLAY`,
                );
            } else if (orderKeySet.has(orderKey)) {
                this.rejectQuery(
                    `Invalid ORDER semantics - ordering by column ${orderKey} multiple times`,
                );
            }
            orderKeySet.add(orderKey);
        });

        return { dir: ordering, keys: orderKeys };
    }

    // Extracts APPLY (aggregations) from query string:
    private parseApply(
        applyStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
    ): Array<{
        [key: string]: { [key in InsightAggregatorKind]?: string };
    }> {
        const aggregators = applyStr.split(/, | and /);

        const aggNames = new Set<string>(); // Each aggregation must have a unique name
        const applyDetails: Array<{
            [key: string]: { [key in InsightAggregatorKind]?: string };
        }> = [];

        // Extract the agg name, operation and key:
        aggregators.forEach((aggStr) => {
            const aggMatchObject = aggStr.match(querySectionREs.aggNameOpColRE);

            // If no match, throw an error:
            if (!aggMatchObject) {
                this.rejectQuery(`Bad Aggregation Syntax found: ${aggStr}`);
            }

            const {
                NAME: aggName,
                OPERATION: aggOp,
                COLNAME: aggCol,
            } = aggMatchObject.groups;

            // If we have a duplicate name for an agg, error:
            if (aggNames.has(aggName)) {
                this.rejectQuery(
                    `Multiple Identical Aggregation Names found: ${aggName}`,
                );
            }

            const aggOpName =
                InsightAggregatorKind[aggOp as InsightAggregatorKind];

            // If agg operation is not valid:
            if (!Object.values(InsightAggregatorKind).includes(aggOpName)) {
                this.rejectQuery(
                    `Invalid Aggregation operation found: ${aggOp}`,
                );
            }

            const { aggType } = queryAggNameToIAggregatorInfo[aggOpName];

            // Confirm that aggregation type matches column type:
            const colTypeRE = querySectionREs.colTypeREs[aggType];
            if (!colTypeRE.test(aggCol)) {
                this.rejectQuery(
                    `Aggregator ${aggName} cannot be used with ${aggType} column ${aggCol}`,
                );
            }

            aggNames.add(aggName);
            applyDetails.push({
                [aggName]: {
                    [aggOpName]: `${id}_${queryColNameStrToKeyStr[aggCol]}`,
                },
            });
        });

        return applyDetails;
    }

    // Builds up the nested AST WHERE Object
    private buildFilters(
        filterOperatorArr: string[],
        id: string,
        currentIndex: number,
        querySectionREs: QuerySectionREs,
    ): any {
        // If we only have a single filter, just build and return that single filter
        if (currentIndex === 0) {
            return this.buildSingleFilter(
                filterOperatorArr[0],
                id,
                querySectionREs,
            );
        }

        // Otherwise build left and right filters and combine with logical filter
        const rightFilter = this.buildSingleFilter(
            filterOperatorArr[currentIndex],
            id,
            querySectionREs,
        );

        const logicalFilter =
            filterOperatorArr[currentIndex - 1] === "and" ? "AND" : "OR";

        const leftFilter = this.buildFilters(
            filterOperatorArr,
            id,
            currentIndex - 2,
            querySectionREs,
        );

        return { [logicalFilter]: [leftFilter, rightFilter] };
    }

    // Builds and returns a single AST Filter Condition
    private buildSingleFilter(
        filterStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
    ): any {
        // Parse relevant information from the filterstring:
        const filterMatchObj = filterStr.match(querySectionREs.filterDetailRE);

        if (!filterMatchObj) {
            this.rejectQuery(`Invalid filter syntax: ${filterStr}`);
        }

        const {
            groups: { COLNAME: colname, CONDITION: condition, VALUE: value },
        } = filterMatchObj;

        const { key, valueParser, negation } =
            conditionStringToIFilterInfo[condition];

        const conditionColName = `${id}_${queryColNameStrToKeyStr[colname]}`;
        const conditionValue = valueParser(value);

        let builtFilter: any = {
            [key]: { [conditionColName]: conditionValue },
        };

        // If this filter is a negation, then wrap filter inside a NOT filter:
        if (negation) {
            builtFilter = { NOT: builtFilter };
        }

        return builtFilter;
    }

    /**
     * Helper method to check that Query AST is valid before
     * building the query from it.
     *
     * If the query is not valid the method throws an error by calling
     * the rejectQuery() method
     *
     * @param query Query AST Object to be validated
     */
    private validateQueryAST(query: InsightASTQuery): boolean {
        // Validate Dataset Name
        if (!query.ID || typeof query.ID !== "string") {
            this.rejectQuery(`Invalid Query: No Dataset ID was given`);
        }

        const queryID: string = query.ID;

        // Validate id and kind
        if (
            queryID.includes("_") ||
            queryID.includes(" ") ||
            reservedRE.test(queryID)
        ) {
            this.rejectQuery(
                `Invalid Query: Dataset ID cannot contain '_', ' ' or equal RESERVED, got: ${queryID}`,
            );
        }

        // Validate Dataset Kind
        if (!Object.values(InsightDatasetKind).includes(query.KIND)) {
            this.rejectQuery(
                `Invalid Query: Dataset KIND can only be 'courses' or 'rooms', got: ${query.KIND}`,
            );
        }

        // Validate WHERE Section of query
        if (!query.WHERE || typeof query.WHERE !== "object") {
            this.rejectQuery(
                `Invalid Query: Query contained no valid WHERE section - include WHERE:{} if no filters are required`,
            );
        }

        if (Object.keys(query.WHERE).length > 0) {
            // Recursively validate all of WHERE
            this.validateWhere(queryID, query.KIND, query.WHERE);
        }

        // Validate COLUMNS Section of query
        if (
            !query.OPTIONS ||
            !query.OPTIONS.COLUMNS ||
            !Array.isArray(query.OPTIONS.COLUMNS) ||
            query.OPTIONS.COLUMNS.length === 0
        ) {
            this.rejectQuery(
                `Invalid Query: Query contained no COLUMNS to display`,
            );
        }

        const queryColumns: string[] = query.OPTIONS.COLUMNS;

        // Validate TRANSFORMATIONS section of query
        if (query.TRANSFORMATIONS !== undefined) {
            const queryGroup = query.TRANSFORMATIONS.GROUP;
            const queryApply = query.TRANSFORMATIONS.APPLY;

            if (
                !queryGroup ||
                !Array.isArray(queryGroup) ||
                queryGroup.length === 0
            ) {
                this.rejectQuery(
                    `Invalid Query: Empty or invalid GROUP operation - all TRANSFORMATIONS require min. 1 GROUP key`,
                );
            }

            // Validate APPLY Section of Query Object
            if (queryApply !== undefined) {
                if (!Array.isArray(queryApply) || queryApply.length === 0) {
                    this.rejectQuery(
                        `Invalid Query: Empty or invalid APPLY section`,
                    );
                }

                queryApply.forEach((apply) => {
                    const name = Object.keys(apply)[0];
                    const aggName = Object.keys(
                        apply[name],
                    )[0] as InsightAggregatorKind;

                    // Check Aggregation Name is valid
                    // No spaces, underscores or equal to RESERVED
                    if (
                        name.includes("_") ||
                        name.includes(" ") ||
                        reservedRE.test(name)
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Invalid Aggregation Name: ${name}`,
                        );
                    }

                    // Check Aggregation Operation Name is valid
                    if (
                        !Object.values(InsightAggregatorKind).includes(aggName)
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Unrecognised Aggregation Operation: ${aggName}`,
                        );
                    }

                    const aggInfo = queryAggNameToIAggregatorInfo[aggName];
                    const colName = apply[name][aggName];

                    // Check the name of the column to be aggregated is valid
                    if (
                        !this.validateASTColName(queryID, query.KIND, colName)
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Invalid column name for APPLY: ${colName}`,
                        );
                    }

                    // Check that the colName is valid for the dataset kind
                    const [strColName, { key: colKey, type: colType }] =
                        this.getColDetailsFromKeyAndKind(
                            colName.split("_")[1],
                            query.KIND,
                        );

                    // Ensure the aggregation operation is valid for the given column:
                    if (aggInfo.aggType === "number" && colType !== "number") {
                        this.rejectQuery(
                            `Invalid Query: Aggregation type ${aggName} cannot be applied to ${strColName} column`,
                        );
                    }
                });
            }

            // We can only DISPLAY/COLUMNS that are GROUP or APPLY
            const applyColNames = queryApply
                ? queryApply.map((applyObj) => Object.keys(applyObj)[0])
                : [];

            queryColumns.forEach((colName) => {
                // If it is a valid column name it must be in GROUP
                const validColName = this.validateASTColName(
                    query.ID,
                    query.KIND,
                    colName,
                );
                if (validColName && !queryGroup.includes(colName)) {
                    this.rejectQuery(
                        `Invalid Query: When GROUP present COLUMNS must be in GROUP or APPLY, got: ${colName}`,
                    );
                } else if (!validColName && !applyColNames.includes(colName)) {
                    // Not a regular columns and we have not defined it as an aggregator name
                    this.rejectQuery(
                        `Invalid Query: Unrecognised column name ${colName} in COLUMNS`,
                    );
                }
            });
        } else {
            // No TRANSFORMATIONS, DISPLAY/COLUMNS must all be valid
            queryColumns.forEach((colName) => {
                if (!this.validateASTColName(query.ID, query.KIND, colName)) {
                    this.rejectQuery(
                        `Invalid Query: Invalid column name ${colName} in COLUMNS`,
                    );
                }
            });
        }

        // Validate ORDER Section - Can only ORDER by DISPLAY/COLUMNS
        if (query.OPTIONS.ORDER) {
            const queryOrder = query.OPTIONS.ORDER;

            if (typeof queryOrder === "string") {
                // Basic Ordering Format - single query order ASCENDING
                // ORDER column must also be in COLUMNS / DISPLAY
                if (!queryColumns.includes(queryOrder)) {
                    this.rejectQuery(
                        `Invalid Query: ORDER columns must be in COLUMNS, got ${queryOrder}`,
                    );
                }
            } else {
                const queryOrderObj = queryOrder as InsightASTQueryOrderObject;

                if (
                    !queryOrderObj.dir ||
                    !Object.values(InsightASTQueryOrderDir).includes(
                        queryOrderObj.dir,
                    )
                ) {
                    this.rejectQuery(
                        `Invalid Query: 'dir' property of ORDER Invalid: ${queryOrder}`,
                    );
                }

                const queryOrderKeys = queryOrderObj.keys;

                if (
                    !queryOrderKeys ||
                    !Array.isArray(queryOrderKeys) ||
                    !queryOrderKeys
                ) {
                    this.rejectQuery(
                        `Invalid Query: No keys specified in 'keys' property of ORDER: ${queryOrder}`,
                    );
                }

                // All ORDER keys must be in DISPLAY/COLUMNS
                queryOrderKeys.forEach((key) => {
                    if (!queryColumns.includes(key)) {
                        this.rejectQuery(
                            `Invalid Query: Cannot ORDER by column not in COLUMNS, got: ${key}`,
                        );
                    }
                });
            }
        }

        return true;
    }

    private validateWhere(
        datasetID: string,
        datasetKind: InsightDatasetKind,
        whereObj: any,
    ): boolean {
        const conditionKey = Object.keys(whereObj)[0];

        if (!conditionKey || Object.keys(whereObj).length > 1) {
            this.rejectQuery(
                `Invalid Query: Invalid WHERE section of query: ${JSON.stringify(
                    whereObj,
                )}`,
            );
        }

        // Logical combination conditional -> process all sub-conditionals
        if (conditionKey === "AND" || conditionKey === "OR") {
            const conditionArr = whereObj[conditionKey];
            if (
                !conditionArr ||
                !Array.isArray(conditionArr) ||
                conditionArr.length !== 2
            ) {
                this.rejectQuery(
                    `Invalid Query: Invalid WHERE logical condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            conditionArr.forEach((subCondition: any) => {
                this.validateWhere(datasetID, datasetKind, subCondition);
            });

            return true;
        }

        // NOT logical conditional -> Validate its sub-condition
        if (conditionKey === "NOT") {
            const subCondition = whereObj[conditionKey];
            return this.validateWhere(datasetID, datasetKind, subCondition);
        }

        // Single conditional
        if (conditionKeyToIFilterInfo.hasOwnProperty(conditionKey)) {
            if (
                typeof whereObj[conditionKey] !== "object" ||
                Object.keys(whereObj[conditionKey]).length !== 1
            ) {
                this.rejectQuery(
                    `Invalid Query: Invalid WHERE single condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            // Check colName is valid for dataset ID and Kind
            const colName = Object.keys(whereObj[conditionKey])[0];
            this.validateASTColName(datasetID, datasetKind, colName);

            // Check that condition value, conditionKey and column are all
            // the same type (number or string):
            const colKey = colName.split("_")[1];
            const [stringColName, { type: colType }] =
                this.getColDetailsFromKeyAndKind(colKey, datasetKind);

            const conditionVal = whereObj[conditionKey][colName];
            const valueType = typeof conditionVal;
            const { conditionType } = conditionKeyToIFilterInfo[conditionKey];

            if (valueType !== conditionType || colType !== conditionType) {
                this.rejectQuery(
                    `Invalid Query: Type mismatch in WHERE condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            // If the type is string, check that the string is valid (no '*' or '"')
            if (
                valueType === "string" &&
                (conditionVal.includes("*") || conditionVal.includes('"'))
            ) {
                this.rejectQuery(
                    `Invalid Query: WHERE condition string cannot include '*' or '_', got: ${conditionVal}`,
                );
            }

            return true;
        } else {
            // Invalid condition key in WHERE
            this.rejectQuery(
                `Invalid Query: Invalid key in WHERE: ${conditionKey}`,
            );
        }
    }

    /**
     * Helper function to validate that a given column name in Query AST Object is valid
     * e.g. courses_avg is valid for a 'courses' kind dataset, where courses_furniture
     * would be invalid
     * @param datasetID the id of the dataset that is being queried
     * @param datasetKind the dataset kind of the dataset being queried (courses | rooms)
     * @param queryColName the column name in the Query AST Object
     */
    private validateASTColName(
        datasetID: string,
        datasetKind: InsightDatasetKind,
        queryColName: string,
    ): boolean {
        const nameSections = queryColName.split("_");

        if (nameSections.length !== 2) {
            return false;
        }

        const [colID, colKey] = nameSections;

        if (colID !== datasetID) {
            return false;
        }

        // Check that the colKey is valid for the dataset kind
        const matchingColumn = this.getColDetailsFromKeyAndKind(
            colKey,
            datasetKind,
        );

        // If we find no matching Column, the column key was not valid
        if (!matchingColumn) {
            return false;
        }

        // Otherwise the column name is valid for dataset id and kind
        return true;
    }

    /**
     * Helper method that given a requested column key e.g. 'avg'
     * and the dataset kind being queried, returns details about
     * the associated column, if it is a valid key for a column in
     * the given dataset kind.
     *
     * @param colKey string key of column to get details of
     * @param datasetKind the dataset KIND being queried
     */
    private getColDetailsFromKeyAndKind(
        colKey: string,
        datasetKind: InsightDatasetKind,
    ): [string, { key: string; type: "number" | "string" }] {
        const validColNames = Object.entries(
            strQueryColNamesToKeyAndType[datasetKind],
        );

        const colMatch = validColNames.filter(
            ([stringColName, { key, type }]) => {
                return key === colKey;
            },
        );

        return colMatch[0];
    }

    private rejectQuery(message: string) {
        throw new Error(`StringQueryToASTQueryTranslator ERROR: ${message}`);
    }
}

// Driver script to translate all Dynamic Insight Facade Queries from String Q's to AST Q's
// and add them to the query JSON, so Insight Facade can be tested with both query types
const translator = new StringQueryToASTQueryTranslator();
const queryDir = path.join(__dirname, "../../../test/queries");

const validQueryDirs = [queryDir];

const queryFilePaths: string[] = [];

while (validQueryDirs.length > 0) {
    const currentDir = validQueryDirs.pop();

    const files = fs.readdirSync(currentDir);

    files.forEach((fileName) => {
        const filePath = path.join(currentDir, fileName);
        // Don't translate invalid queries
        if (fileName === "invalid_queries") {
            return;
        }

        if (fs.statSync(filePath).isDirectory()) {
            validQueryDirs.push(filePath);
        } else {
            queryFilePaths.push(filePath);
        }
    });
}

queryFilePaths.forEach((filePath) => {
    const file: {
        title: string;
        queryString?: string;
        queryAST?: any;
        response: InsightResponse;
    } = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));

    // Don't translate invalid queries
    if (file.response.body.hasOwnProperty("error")) {
        return;
    }

    file.queryAST = translator.translateQuery(file.queryString);

    // Re-save the query JSON with the added "queryAST" property:
    fs.writeFileSync(filePath, JSON.stringify(file));
});
