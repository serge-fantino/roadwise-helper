import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Settings, settingsService, RoadInfoProvider, MapStyle, TurnDetectionVersion } from "../services/SettingsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "./ui/use-toast";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import SplashScreen from "./SplashScreen";

const SettingsView = () => {
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);
  const [settings, setSettings] = useState<Settings>(settingsService.getSettings());

  useEffect(() => {
    const observer = (newSettings: Settings) => {
      setSettings(newSettings);
    };
    settingsService.addObserver(observer);
    return () => settingsService.removeObserver(observer);
  }, []);

  const handleSettingChange = (key: keyof Settings, value: string | number | boolean) => {
    if (typeof value === 'string' && [
      'minTurnAngle', 
      'minTurnSpeed', 
      'maxTurnAngle', 
      'defaultSpeed', 
      'predictionDistance',
      'maxTurnDistance',
      'minTurnDistance',
      'updateInterval'
    ].includes(key)) {
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
    <>
      {showAbout && <SplashScreen onComplete={() => setShowAbout(false)} />}
      
      <div className="h-screen flex flex-col">
        <div className="h-12 bg-gray-900 p-2 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-gray-800"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <Button
            variant="ghost"
            className="text-white hover:bg-gray-800"
            onClick={() => setShowAbout(true)}
          >
            <Info className="h-4 w-4 mr-2" />
            About
          </Button>
        </div>
        
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold mb-6">Réglages</h1>
          
          <Tabs defaultValue="curves" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="curves">Virages</TabsTrigger>
              <TabsTrigger value="providers">Services</TabsTrigger>
              <TabsTrigger value="map">Carte</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="navigation">Navigation</TabsTrigger>
            </TabsList>

            <TabsContent value="curves" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Algorithme de détection</Label>
                  <Select
                    value={settings.turnDetectionVersion}
                    onValueChange={(value: TurnDetectionVersion) => handleSettingChange('turnDetectionVersion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">V1 (angle par point)</SelectItem>
                      <SelectItem value="v2">V2 (différentiel roue / courbure par mètre)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    V2 est une expérimentation: resampling 1m + fenêtre 1000m.
                  </p>
                </div>

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
                  <Label htmlFor="maxTurnAngle">Angle maximal pour un virage (degrés)</Label>
                  <Input
                    id="maxTurnAngle"
                    type="number"
                    value={settings.maxTurnAngle}
                    onChange={(e) => handleSettingChange('maxTurnAngle', e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="minTurnDistance">Distance minimale d'un virage (mètres)</Label>
                  <Input
                    id="minTurnDistance"
                    type="number"
                    value={settings.minTurnDistance}
                    onChange={(e) => handleSettingChange('minTurnDistance', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTurnDistance">Distance maximale d'un virage (mètres)</Label>
                  <Input
                    id="maxTurnDistance"
                    type="number"
                    value={settings.maxTurnDistance}
                    onChange={(e) => handleSettingChange('maxTurnDistance', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="predictionDistance">Distance d'analyse des virages (mètres)</Label>
                  <Input
                    id="predictionDistance"
                    type="number"
                    value={settings.predictionDistance}
                    onChange={(e) => handleSettingChange('predictionDistance', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="providers" className="space-y-6">
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="disable-overpass"
                  checked={settings.disableOverpass}
                  onCheckedChange={(checked) => handleSettingChange('disableOverpass', checked)}
                />
                <Label htmlFor="disable-overpass">Désactiver les appels à Overpass API</Label>
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
            </TabsContent>

            <TabsContent value="map" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Style de carte</Label>
                  <Select 
                    value={settings.mapStyle} 
                    onValueChange={(value: MapStyle) => handleSettingChange('mapStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carto-positron">CartoDB Positron (Clair, moderne)</SelectItem>
                      <SelectItem value="carto-dark">CartoDB Dark Matter (Sombre)</SelectItem>
                      <SelectItem value="stamen-terrain">Stamen Terrain (Avec relief)</SelectItem>
                      <SelectItem value="stamen-toner">Stamen Toner (Noir & blanc)</SelectItem>
                      <SelectItem value="wikimedia">Wikimedia (Clair, lisible)</SelectItem>
                      <SelectItem value="opentopomap">OpenTopoMap (Topographique)</SelectItem>
                      <SelectItem value="osm">OpenStreetMap (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Choisissez le style visuel de la carte. Tous les styles sont gratuits et ne nécessitent pas de clé API.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="simulation" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Version du simulateur</Label>
                  <Select 
                    value={settings.simulatorVersion} 
                    onValueChange={(value: 'v1' | 'v2') => handleSettingChange('simulatorVersion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">Version 1 (Simple)</SelectItem>
                      <SelectItem value="v2">Version 2 (Physique)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="updateInterval">Intervalle de mise à jour (ms)</Label>
                  <Input
                    id="updateInterval"
                    type="number"
                    value={settings.updateInterval}
                    onChange={(e) => handleSettingChange('updateInterval', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Style de conduite</Label>
                  <Select 
                    value={settings.drivingStyle} 
                    onValueChange={(value: 'prudent' | 'normal' | 'sportif') => handleSettingChange('drivingStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prudent">Prudent</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="sportif">Sportif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="navigation" className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-recalculate"
                  checked={settings.enableAutoRecalculate}
                  onCheckedChange={(checked) => handleSettingChange('enableAutoRecalculate', checked)}
                />
                <Label htmlFor="auto-recalculate">Recalcul automatique de l'itinéraire</Label>
              </div>
              <p className="text-sm text-gray-500">
                Lorsque cette option est activée, l'itinéraire sera automatiquement recalculé si le véhicule s'écarte trop du trajet prévu.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default SettingsView;
