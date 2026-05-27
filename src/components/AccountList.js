import React from 'react';
import { getAccounts } from '../db';

function AccountList() {
  const accounts = getAccounts();

  return (
    <div>
      {accounts.map(account => (
        <div key={account.id}>
          <h2>{account.name}</h2>
          <p>Balance: {formatNumber(account.balance)}</p>
        </div>
      ))}
    </div>
  );
}

export default AccountList;
