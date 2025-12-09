import { HomeTemplate } from "../../templates/home";
import { DisasterMap } from "../../organisms/disasterMap";
import { TrafficReroutingDemo } from "../../organisms/trafficReroutingDemo";

export const HomePage = () => (
  <HomeTemplate>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disaster Response System</h1>

      <h2 className="text-xl font-bold">Active Disasters</h2>
      <DisasterMap height="600px" />

      <div className="border-t border-gray-300 my-8"></div>

      <TrafficReroutingDemo height="500px" />
    </div>
  </HomeTemplate>
);
