import { HomeTemplate } from "../../templates/home";
import { DisasterMap } from "../../organisms/disasterMap";

export const HomePage = () => (
  <HomeTemplate>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disaster Response System</h1>
      <DisasterMap height="600px" />
    </div>
  </HomeTemplate>
);
