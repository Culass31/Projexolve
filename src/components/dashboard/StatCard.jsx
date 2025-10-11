import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}));

const AvatarWrapper = styled(Avatar)(({ theme, color = 'primary' }) => ({
  backgroundColor: theme.palette[color].light,
  color: theme.palette[color].dark,
  width: 56,
  height: 56,
}));

const StatCard = ({ title, value, icon, color = 'primary' }) => {
  return (
    <StyledCard>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" component="div" fontWeight="600">
              {value}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          <AvatarWrapper color={color}>
            {icon}
          </AvatarWrapper>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default StatCard;
