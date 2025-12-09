import { Disaster } from "../types/disaster";
import { mockDisasters } from "../data/mockDisasters";

export const disasterService = {
  async getDisasters(): Promise<Disaster[]> {
    // For now, return mock data from file
    // TODO: Replace with actual API call when endpoint is ready
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockDisasters), 100);
    });
  },
};
