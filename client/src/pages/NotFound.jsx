import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-brand-soft border-2 border-brand-primary flex items-center justify-center text-brand-dark font-black text-3xl mb-5">
        404
      </div>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-dark mb-2.5">
        Page Not Found
      </h2>
      <p className="text-base sm:text-lg text-brand-dark/75 max-w-md mb-7 leading-relaxed">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" size="lg">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
