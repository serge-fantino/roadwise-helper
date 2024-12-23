import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SettingsView = () => {
  const navigate = useNavigate();

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
        {/* Les contrôles de réglages seront ajoutés ici plus tard */}
      </div>
    </div>
  );
};

export default SettingsView;