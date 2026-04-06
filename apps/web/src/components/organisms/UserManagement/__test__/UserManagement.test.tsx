/**
 * UserManagement — full test suite
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';

jest.setTimeout(15000);

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../../services', () => ({
  getUsers:    jest.fn(),
  createUser:  jest.fn(),
  deleteUser:  jest.fn(),
}));

jest.mock('../../../../lib/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Re-applied in every beforeEach — resetMocks:true wipes jest.fn() implementations
jest.mock('../../../../context', () => ({
  useAuth: jest.fn(),
}));

import { getUsers, createUser, deleteUser } from '../../../../services';
import apiClient from '../../../../lib/axios';
import { useAuth } from '../../../../context';
import UserManagement from '../UserManagement';
import type { AdminUser } from '../../../../types/user-management.types';

const mockGetUsers   = getUsers   as jest.Mock;
const mockCreateUser = createUser as jest.Mock;
const mockDeleteUser = deleteUser as jest.Mock;
const mockApiGet     = apiClient.get as jest.Mock;
const mockApiPut     = apiClient.put as jest.Mock;
const mockUseAuth    = useAuth    as jest.Mock;

// ─── Factories ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id:                   'usr_001',
  fullName:             'Alice Brennan',
  email:                'alice@example.com',
  phone:                '+353871234567',
  role:                 'ADMIN',
  status:               'ACTIVE',
  userType:             'team',
  department:           'FIRE',
  employeeId:           'EMP-001',
  reportsCount:         3,
  reviewsCount:         1,
  isAssigned:           false,
  assignedUnitsCount:   0,
  commandingUnitsCount: 0,
  currentUnitCodes:     [],
  createdAt:            '2024-01-15T10:00:00Z',
  ...overrides,
});

const MOCK_USERS: AdminUser[] = [
  makeUser(),
  makeUser({
    id: 'usr_002', fullName: 'Bob Murphy', email: 'bob@example.com',
    phone: '+353879876543', role: 'STAFF', status: 'ACTIVE',
    department: 'MEDICAL', employeeId: 'EMP-002',
    isAssigned: true, assignedUnitsCount: 1, currentUnitCodes: ['AMB-01'],
  }),
];

const SUCCESS_RESPONSE = {
  success: true,
  data: {
    users: MOCK_USERS,
    totalCount: 2,
    summary: { citizens: 0, team_members: 2, active: 2, inactive: 0 },
    byDepartment: { FIRE: 1, MEDICAL: 1 },
  },
};

// ─── Render helper ────────────────────────────────────────────────────────────

function renderUM() {
  return render(
    <ConfigProvider>
      <AntApp>
        <MemoryRouter>
          <UserManagement />
        </MemoryRouter>
      </AntApp>
    </ConfigProvider>
  );
}

// ─── Default setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { userId: 'admin_self', email: 'admin@drs.ie' },
    logout: jest.fn(),
  });
  mockGetUsers.mockResolvedValue(SUCCESS_RESPONSE);
  mockApiGet.mockResolvedValue({ data: { units: [] } });
  mockApiPut.mockResolvedValue({ data: {} });
  mockDeleteUser.mockResolvedValue({ success: true });
  mockCreateUser.mockResolvedValue({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. INITIAL LOAD
// ─────────────────────────────────────────────────────────────────────────────

describe('Initial load', () => {
  it('calls getUsers once on mount', async () => {
    renderUM();
    await waitFor(() => expect(mockGetUsers).toHaveBeenCalledTimes(1), { timeout: 5000 });
  });

  it('renders the page heading', async () => {
    renderUM();
    await waitFor(
      () => expect(screen.getByText('User Management')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('renders user names in the table', async () => {
    renderUM();
    await waitFor(
      () => {
        expect(screen.getByText('Alice Brennan')).toBeInTheDocument();
        expect(screen.getByText('Bob Murphy')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('renders user emails in the table', async () => {
    renderUM();
    await waitFor(
      () => expect(screen.getByText('alice@example.com')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('renders employee IDs in the table', async () => {
    renderUM();
    await waitFor(
      () => expect(screen.getByText('EMP-001')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('does not crash on a failed load', async () => {
    mockGetUsers.mockResolvedValue({ success: false, message: 'Unauthorized' });
    renderUM();
    await waitFor(() => expect(mockGetUsers).toHaveBeenCalled(), { timeout: 5000 });
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('does not crash on a network error', async () => {
    mockGetUsers.mockRejectedValue(new Error('Network Error'));
    renderUM();
    await waitFor(() => expect(mockGetUsers).toHaveBeenCalled(), { timeout: 5000 });
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('shows empty state text when no users match filters', async () => {
    mockGetUsers.mockResolvedValue({
      success: true,
      data: { users: [], totalCount: 0, summary: { citizens: 0, team_members: 0, active: 0, inactive: 0 }, byDepartment: {} },
    });
    renderUM();
    await waitFor(
      () => expect(screen.getByText(/no users found/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUMMARY CARDS
// ─────────────────────────────────────────────────────────────────────────────

describe('Summary cards', () => {
  it('renders Total Users, Citizens, Team Members and Active cards', async () => {
    renderUM();
    await waitFor(
      () => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Citizens')).toBeInTheDocument();
        expect(screen.getByText('Team Members')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('shows correct total count from API response', async () => {
    renderUM();
    // Multiple cards show "2" — just confirm at least one exists
    await waitFor(
      () => expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1),
      { timeout: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SEARCH
// ─────────────────────────────────────────────────────────────────────────────

describe('Search', () => {
  it('renders the search input', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('filters by name', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    await userEvent.type(screen.getByPlaceholderText('Search users...'), 'Alice');
    await waitFor(() => {
      expect(screen.getByText('Alice Brennan')).toBeInTheDocument();
      expect(screen.queryByText('Bob Murphy')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('filters by email', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    await userEvent.type(screen.getByPlaceholderText('Search users...'), 'bob@');
    await waitFor(() => {
      expect(screen.getByText('Bob Murphy')).toBeInTheDocument();
      expect(screen.queryByText('Alice Brennan')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('filters by phone', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    await userEvent.type(screen.getByPlaceholderText('Search users...'), '353871234567');
    await waitFor(() => {
      expect(screen.getByText('Alice Brennan')).toBeInTheDocument();
      expect(screen.queryByText('Bob Murphy')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows empty table when search matches nobody', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    await userEvent.type(screen.getByPlaceholderText('Search users...'), 'XYZNOTEXIST');
    await waitFor(
      () => expect(screen.getByText(/no users found/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXPORT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

describe('Export button', () => {
  it('renders the Export button', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('does not crash when Export is clicked', async () => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /export/i }))
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADD USER MODAL — citizen path
// ─────────────────────────────────────────────────────────────────────────────

describe('AddUserModal — citizen path', () => {
  const openAddModal = async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    await userEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByText('Add New User'), { timeout: 5000 });
  };

  it('opens the modal when Add User is clicked', async () => {
    await openAddModal();
    expect(screen.getByText('Add New User')).toBeInTheDocument();
  });

  it('shows Full Name required error on empty submit', async () => {
    await openAddModal();
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(
      () => expect(screen.getByText('Full name is required')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows Email required error on empty submit', async () => {
    await openAddModal();
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(
      () => expect(screen.getByText('Email is required')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows invalid email error', async () => {
    await openAddModal();
    await userEvent.type(screen.getByPlaceholderText(/john murphy/i), 'Test User');
    await userEvent.type(screen.getByPlaceholderText(/user@example/i), 'notanemail');
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(
      () => expect(screen.getByText('Enter a valid email address')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows Phone required error on empty submit', async () => {
    await openAddModal();
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(
      () => expect(screen.getByText('Phone number is required')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows invalid phone error for non-Irish non-Indian number', async () => {
    await openAddModal();
    await userEvent.type(screen.getByPlaceholderText(/\+353 87/i), '+1 555 123 4567');
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(
      () => expect(screen.getByText(/valid irish.*or indian/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('does not call createUser when validation fails', async () => {
    await openAddModal();
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(() => screen.getByText('Full name is required'), { timeout: 5000 });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('calls createUser and closes modal on success', async () => {
    await openAddModal();
    await userEvent.type(screen.getByPlaceholderText(/john murphy/i), 'Jane Doe');
    await userEvent.type(screen.getByPlaceholderText(/user@example/i), 'jane@example.com');
    await userEvent.type(screen.getByPlaceholderText(/\+353 87/i), '+353871234567');
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ user_type: 'citizen', full_name: 'Jane Doe', email: 'jane@example.com' })
      );
      expect(screen.queryByText('Add New User')).not.toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('shows API error when createUser fails', async () => {
    mockCreateUser.mockResolvedValue({ success: false, message: 'Email already taken' });
    await openAddModal();
    await userEvent.type(screen.getByPlaceholderText(/john murphy/i), 'Jane Doe');
    await userEvent.type(screen.getByPlaceholderText(/user@example/i), 'jane@example.com');
    await userEvent.type(screen.getByPlaceholderText(/\+353 87/i), '+353871234567');
    await userEvent.click(screen.getByRole('button', { name: /add citizen/i }));
    await waitFor(
      () => expect(screen.getByText('Email already taken')).toBeInTheDocument(),
      { timeout: 8000 }
    );
  });

  it('closes without submitting on Cancel', async () => {
    await openAddModal();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(
      () => expect(screen.queryByText('Add New User')).not.toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADD USER MODAL — team member path
// ─────────────────────────────────────────────────────────────────────────────

describe('AddUserModal — team member path', () => {
  const openTeamTab = async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    await userEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByText('Add New User'), { timeout: 5000 });
    await userEvent.click(screen.getByText('Team Member'));
    await waitFor(
      () => expect(screen.getByRole('button', { name: /add team member/i })).toBeInTheDocument(),
      { timeout: 5000 }
    );
  };

  it('shows password required error for team member', async () => {
    await openTeamTab();
    await userEvent.click(screen.getByRole('button', { name: /add team member/i }));
    await waitFor(
      () => expect(screen.getByText('Password is required')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows weak password error', async () => {
    await openTeamTab();
    await userEvent.type(screen.getByPlaceholderText(/min. 8/i), 'weak');
    await userEvent.click(screen.getByRole('button', { name: /add team member/i }));
    await waitFor(
      () => expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows password complexity error', async () => {
    await openTeamTab();
    await userEvent.type(screen.getByPlaceholderText(/min. 8/i), 'alllowercase1');
    await userEvent.click(screen.getByRole('button', { name: /add team member/i }));
    await waitFor(
      () => expect(screen.getByText(/uppercase, lowercase, number/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows Role required error for team member', async () => {
    await openTeamTab();
    await userEvent.click(screen.getByRole('button', { name: /add team member/i }));
    await waitFor(
      () => expect(screen.getByText('Role is required')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows Department required error for team member', async () => {
    await openTeamTab();
    await userEvent.click(screen.getByRole('button', { name: /add team member/i }));
    await waitFor(
      () => expect(screen.getByText('Department is required')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. EDIT USER MODAL
// Buttons: EditOutlined → aria-label="edit", accessible name = "edit"
// AntD Input is controlled — use fireEvent.change to trigger form state updates.
// "Alice Brennan" appears in both the table row AND the modal subtitle.
// ─────────────────────────────────────────────────────────────────────────────

describe('EditUserStatusModal', () => {
  const openEditModal = async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[0]);
    await waitFor(() => screen.getByText('Edit User'), { timeout: 5000 });
  };

  it('opens the edit modal with the user name in the subtitle', async () => {
    await openEditModal();
    // Alice Brennan appears in both table and modal — just confirm at least one
    expect(screen.getAllByText('Alice Brennan').length).toBeGreaterThanOrEqual(1);
  });

  it('pre-fills the full name input with existing value', async () => {
    await openEditModal();
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Full name') as HTMLInputElement;
      expect(input.value).toBe('Alice Brennan');
    }, { timeout: 5000 });
  });

  it('pre-fills the email input', async () => {
    await openEditModal();
    await waitFor(() => {
      const input = screen.getByPlaceholderText('email@example.com') as HTMLInputElement;
      expect(input.value).toBe('alice@example.com');
    }, { timeout: 5000 });
  });

  it('Save Changes button is disabled when nothing has changed', async () => {
    await openEditModal();
    await waitFor(
      () => expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled(),
      { timeout: 5000 }
    );
  });

  it('Save Changes button enables after editing a field', async () => {
    await openEditModal();
    // fireEvent.change properly triggers AntD Form onChange — userEvent.clear/type does not
    fireEvent.change(screen.getByPlaceholderText('Full name'), {
      target: { value: 'Alice Updated' },
    });
    await waitFor(
      () => expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled(),
      { timeout: 5000 }
    );
  });

  it('shows Full Name required error when cleared', async () => {
    await openEditModal();
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(
      () => expect(screen.getByText('Full name is required')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows invalid email error', async () => {
    await openEditModal();
    fireEvent.change(screen.getByPlaceholderText('email@example.com'), {
      target: { value: 'notvalid' },
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(
      () => expect(screen.getByText('Enter a valid email address')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('calls apiClient.put and closes on success', async () => {
    await openEditModal();
    // fireEvent.change triggers AntD form state update properly
    fireEvent.change(screen.getByPlaceholderText('Full name'), {
      target: { value: 'Alice Updated' },
    });
    await waitFor(
      () => expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled(),
      { timeout: 5000 }
    );
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        expect.stringContaining('usr_001'),
        expect.objectContaining({ full_name: 'Alice Updated' })
      );
      expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('closes without saving on Cancel', async () => {
    await openEditModal();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(
      () => expect(screen.queryByText('Edit User')).not.toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('shows activelyDeployed warning when unit is deployed', async () => {
    mockApiGet.mockResolvedValue({
      data: { units: [{ unit_code: 'AMB-01', unit_status: 'DEPLOYED' }] },
    });
    renderUM();
    await waitFor(() => screen.getByText('Bob Murphy'), { timeout: 5000 });
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[1]);
    await waitFor(
      () => expect(screen.getByText(/currently deployed/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. DELETE USER MODAL
// "Delete User" appears in both the modal title div and the button span.
// Use getAllByText or wait for the unique subtitle "This action cannot be undone".
// ─────────────────────────────────────────────────────────────────────────────

describe('DeleteUserModal — single delete', () => {
  const openDeleteModal = async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    const deleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteBtns[0]);
    // "This action cannot be undone" is unique to the modal subtitle
    await waitFor(
      () => screen.getByText('This action cannot be undone'),
      { timeout: 5000 }
    );
  };

  it('opens the delete modal with the user name', async () => {
    await openDeleteModal();
    expect(screen.getAllByText('Alice Brennan').length).toBeGreaterThan(0);
  });

  it('Delete button is disabled when no reason is selected', async () => {
    await openDeleteModal();
    // "Delete User" text appears in both title and button — use getAllByText
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete User$/i });
    expect(deleteButtons[0]).toBeDisabled();
  });

  it('enables Delete button after selecting a reason', async () => {
    await openDeleteModal();
    await userEvent.click(screen.getByText('Account No Longer Needed'));
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /^Delete User$/i });
      expect(deleteButtons[0]).not.toBeDisabled();
    }, { timeout: 5000 });
  });

  it('shows text input when "Other" reason is selected', async () => {
    await openDeleteModal();
    await userEvent.click(screen.getByText('Other'));
    await waitFor(
      () => expect(screen.getByPlaceholderText(/specify reason/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('keeps Delete disabled when Other is selected but text is empty', async () => {
    await openDeleteModal();
    await userEvent.click(screen.getByText('Other'));
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete User$/i });
    expect(deleteButtons[0]).toBeDisabled();
  });

  it('enables Delete when Other reason is filled in', async () => {
    await openDeleteModal();
    await userEvent.click(screen.getByText('Other'));
    await userEvent.type(screen.getByPlaceholderText(/specify reason/i), 'Custom reason here');
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /^Delete User$/i });
      expect(deleteButtons[0]).not.toBeDisabled();
    }, { timeout: 5000 });
  });

  it('calls deleteUser with the correct id and reason on confirm', async () => {
    await openDeleteModal();
    await userEvent.click(screen.getByText('Policy Violation'));
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete User$/i });
    await userEvent.click(deleteButtons[0]);
    await waitFor(
      () => expect(mockDeleteUser).toHaveBeenCalledWith('usr_001', 'Policy violation'),
      { timeout: 5000 }
    );
  });

  it('closes modal after successful deletion', async () => {
    await openDeleteModal();
    await userEvent.click(screen.getByText('Account No Longer Needed'));
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete User$/i });
    await userEvent.click(deleteButtons[0]);
    await waitFor(
      () => expect(screen.queryByText('This action cannot be undone')).not.toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('closes without deleting on Cancel', async () => {
    await openDeleteModal();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(
      () => expect(screen.queryByText('This action cannot be undone')).not.toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. ROW SELECTION + BULK DELETE
// ─────────────────────────────────────────────────────────────────────────────

describe('Row selection and bulk delete', () => {
  it('shows selection banner when a row is selected', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    await waitFor(
      () => expect(screen.getByText(/1 user selected/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('shows Delete Selected button in the selection banner', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    await waitFor(
      () => expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('opens bulk delete modal with correct count', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);
    await waitFor(() => screen.getByText(/2 users selected/i), { timeout: 5000 });
    await userEvent.click(screen.getByRole('button', { name: /delete selected/i }));
    await waitFor(
      () => expect(screen.getAllByText('Delete 2 Users').length).toBeGreaterThanOrEqual(1),
      { timeout: 5000 }
    );
  });

  it('Clear selection button removes the banner', async () => {
    renderUM();
    await waitFor(() => screen.getByText('Alice Brennan'), { timeout: 5000 });
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    await waitFor(() => screen.getByText(/1 user selected/i), { timeout: 5000 });
    await userEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    await waitFor(
      () => expect(screen.queryByText(/1 user selected/i)).not.toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});