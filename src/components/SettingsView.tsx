import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Settings, settingsService, RoadInfoProvider } from "../services/SettingsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "./ui/use-toast";

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

  const handleSettingChange = (key: keyof Settings, value: string | number) => {
    if (typeof value === 'string' && ['minTurnAngle', 'minTurnSpeed', 'maxTurnAngle', 'defaultSpeed'].includes(key)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        settingsService.updateSettings({ [key]: numValue });
      }
    } else {
      settingsService.updateSettings({ [key]: value });
    }
  };

  const handleProviderChange = (value: RoadInfoProvider) => {
    if (value === 'mapbox' && !settings.mapboxToken) {
      toast({
        title: "Token Mapbox requis",
        description: "Veuillez configurer votre token Mapbox pour utiliser ce service.",
        variant: "destructive",
      });
      return;
    }
    handleSettingChange('roadInfoProvider', value);
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

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Service d'informations routières</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fournisseur actif</Label>
                <Select 
                  value={settings.roadInfoProvider} 
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overpass">OpenStreetMap (Overpass)</SelectItem>
                    <SelectItem value="nominatim">OpenStreetMap (Nominatim)</SelectItem>
                    <SelectItem value="mapbox">Mapbox (Premium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapboxToken">Token Mapbox</Label>
                <Input
                  id="mapboxToken"
                  type="password"
                  value={settings.mapboxToken}
                  onChange={(e) => handleSettingChange('mapboxToken', e.target.value)}
                  placeholder="pk.eyJ1Ijoi..."
                />
                <p className="text-sm text-gray-500">
                  Requis uniquement pour utiliser le service Mapbox Premium. Obtenez votre token sur{" "}
                  <a 
                    href="https://account.mapbox.com/access-tokens/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    mapbox.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;