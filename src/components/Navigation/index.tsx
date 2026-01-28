import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, Tab, Box } from '@mui/material';
import { routes } from '../../routes';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = routes.findIndex(route => route.path === location.pathname);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    navigate(routes[newValue].path);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={currentTab} onChange={handleChange}>
        {routes.map((route) => (
          <Tab key={route.path} label={route.label} />
        ))}
      </Tabs>
    </Box>
  );
};