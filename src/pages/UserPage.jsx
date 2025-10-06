import { useParams } from "react-router-dom";

function UserPage() {
  const { id } = useParams();
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-100">
      <h1 className="text-2xl">User Page for ID: {id}</h1>
    </div>
  );
}

export default UserPage;
