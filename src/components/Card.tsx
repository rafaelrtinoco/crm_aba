type Props = {
    title: string;
    value: string;
  };
  
  export default function Card({ title, value }: Props) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
        
        <p className="text-sm text-gray-500">
          {title}
        </p>
  
        <h2 className="text-2xl font-bold text-gray-800 mt-2">
          {value}
        </h2>
  
      </div>
    );
  }