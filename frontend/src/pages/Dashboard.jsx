import { useAuth } from '../context/AuthContext';
import AdminDashboard from './dashboard/AdminDashboard';
import SellerDashboard from './dashboard/SellerDashboard';
import TechnicianDashboard from './dashboard/TechnicianDashboard';
import CustomerDashboard from './dashboard/CustomerDashboard';
import './Dashboard.css';

const Dashboard = (props) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="dashboard-page container text-center py-4">
        <h3>Please log in to access the dashboard.</h3>
      </div>
    );
  }

  const role = user.role?.toLowerCase();

  switch (role) {
    case 'admin':
      return <AdminDashboard {...props} />;
    case 'seller':
      return <SellerDashboard {...props} />;
    case 'technician':
      return <TechnicianDashboard {...props} />;
    case 'customer':
      return <CustomerDashboard {...props} />;
    default:
      return (
        <div className="dashboard-page container text-center py-4">
          <h3>Quyền truy cập không hợp lệ.</h3>
        </div>
      );
  }
};

export default Dashboard;
