import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Settings, settingsService } from "../services/SettingsService";

const SettingsView = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(settingsService.getSettings());

  useEffect(() => {
    const observer = (newSettings: Settings) => {
      setSettings(newSettings);
    };
    settingsService.addObserver(observer);
    return () => settingsService.removeObserver(observer);
  }, []);

  const handleSettingChange = (key: keyof Settings, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      settingsService.updateSettings({ [key]: numValue });
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 bg-gray-900 p-2 flex items-center">
        <Button 
          variant="ghost" 
          className="text-white hover:bg-gray-800"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">Réglages</h1>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="minTurnAngle">Angle minimal pour définir un virage (degrés)</Label>
            <Input
              id="minTurnAngle"
              type="number"
              value={settings.minTurnAngle}
              onChange={(e) => handleSettingChange('minTurnAngle', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minTurnSpeed">Vitesse minimale en virage serré (km/h)</Label>
            <Input
              id="minTurnSpeed"
              type="number"
              value={settings.minTurnSpeed}
              onChange={(e) => handleSettingChange('minTurnSpeed', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;