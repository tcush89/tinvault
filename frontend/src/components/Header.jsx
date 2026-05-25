import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  const navClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-stone-700 text-white'
        : 'text-stone-300 hover:bg-stone-700 hover:text-white'
    }`;

  return (
    <header className="bg-stone-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="TinVault" className="w-11 h-11 rounded-xl flex-shrink-0" />
              <span className="text-white text-xl font-bold tracking-tight">TinVault</span>
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={navClass}>Dashboard</NavLink>
              <NavLink to="/cellar" className={navClass}>My Cellar</NavLink>
              <NavLink to="/settings" className={navClass}>Settings</NavLink>
            </nav>
          </div>
          <Link
            to="/add"
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + Add Tin
          </Link>
        </div>
      </div>
    </header>
  );
}
