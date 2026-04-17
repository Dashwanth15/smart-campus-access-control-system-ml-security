/**
 * RoleFilter — dropdown for filtering by user role.
 * Props:
 *   value     {string}   current role value ('all' or role name)
 *   onChange  {fn}       called with selected role string
 *   roles     {string[]} optional custom role list
 */
const DEFAULT_ROLES = ['Admin', 'Student', 'Faculty', 'Guest'];

function RoleFilter({ value = 'all', onChange, roles = DEFAULT_ROLES }) {
  return (
    <select
      className="filter-role-select"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Filter by role"
    >
      <option value="all">👤 All Roles</option>
      {roles.map(r => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}

export default RoleFilter;
