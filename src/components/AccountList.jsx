import { getAccounts } from '../db';
import { formatNumber } from '../utils';

function AccountList() {
  const accounts = getAccounts();

  return (
    <div>
      {accounts.map(account => (
        <div key={account.id}>
          <h2>{account.name}</h2>
          <p>Balance: ৳{formatNumber(account.balance)}</p>
        </div>
      ))}
    </div>
  );
}

export default AccountList;
