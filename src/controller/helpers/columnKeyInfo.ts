import { InsightDatasetKind } from "../IInsightFacade";

/**
 * This file contains objects allowing translation from a string query KIND and column name
 * (e.g. "courses" and "Average") to the corresponding column key and type (e.g. "avg" and "number")
 */

export const strQueryColNamesToKeyAndType: {
    [key in InsightDatasetKind]: {
        [key: string]: { key: string; type: "number" | "string" };
    };
} = {
    courses: {
        Audit: { key: "audit", type: "number" },
        Average: { key: "avg", type: "number" },
        Department: { key: "dept", type: "string" },
        Fail: { key: "fail", type: "number" },
        ID: { key: "id", type: "string" },
        Instructor: { key: "instructor", type: "string" },
        Pass: { key: "pass", type: "number" },
        Title: { key: "title", type: "string" },
        UUID: { key: "uuid", type: "string" },
        Year: { key: "year", type: "number" },
    },
    rooms: {
        "Full Name": { key: "fullname", type: "string" },
        "Short Name": { key: "shortname", type: "string" },
        "Number": { key: "number", type: "string" },
        "Name": { key: "name", type: "string" },
        "Address": { key: "address", type: "string" },
        "Type": { key: "type", type: "string" },
        "Furniture": { key: "furniture", type: "string" },
        "Link": { key: "href", type: "string" },
        "Latitude": { key: "lat", type: "number" },
        "Longitude": { key: "lon", type: "number" },
        "Seats": { key: "seats", type: "number" },
    },
};

// Produce flat object of mappings from String Query Column Name to Query Key
// !!! Refactor alongside String Query Parser Refactoring
export const queryColNameStrToKeyStr: { [key: string]: string } = (() => {
    const result: { [key: string]: string } = {};
    Object.keys(strQueryColNamesToKeyAndType).forEach(
        (kind: InsightDatasetKind) => {
            Object.entries(strQueryColNamesToKeyAndType[kind]).forEach(
                ([strQueryColName, { key: colQueryKey }]) => {
                    result[strQueryColName] = colQueryKey;
                },
            );
        },
    );

    return result;
})();
