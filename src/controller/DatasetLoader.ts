import {
    InsightResponse,
    InsightDataset,
    InsightDatasetKind,
} from "./IInsightFacade";

export default class DatasetLoader {
    private loadedDatasets: { [key: string]: InsightDataset };

    constructor() {
        this.loadedDatasets = {};
    }

    public loadDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<InsightResponse> {
        return new Promise((resolve, reject) => {
            try {
                // Validate the dataset kind, id and content
                this.validateDatasetKind(kind);
                this.validateDatasetId(id);
                this.validateDatasetContent(content);
            } catch (err) {
                return reject({
                    code: 400,
                    body: {
                        error: err.message,
                    },
                });
            }

            reject({ code: -1, body: null });
        });
    }

    // Check that dataset kind is valid (D1 - Rooms dataset kind is not valid)
    private validateDatasetKind(kind: InsightDatasetKind) {
        if (
            !Object.values(InsightDatasetKind).includes(kind) ||
            kind === InsightDatasetKind.Rooms
        ) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: Invalid Dataset Kind Given: ${kind}`,
            );
        }
    }

    // Check that dataset id is valid and not already loaded
    private validateDatasetId(id: string) {
        if (!id) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: Invalid Dataset Id Given: ${id}`,
            );
        } else if (this.loadedDatasets.hasOwnProperty(id)) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: Dataset with ID '${id}' has already been loaded`,
            );
        }
    }

    // Check that content is a string, not null/undefined or empty string
    private validateDatasetContent(content: string) {
        if (!content) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: No dataset content given: ${content}`,
            );
        }
    }
}
