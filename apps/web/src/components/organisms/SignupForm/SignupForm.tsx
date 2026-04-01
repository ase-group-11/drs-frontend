import React, { useState } from 'react';
import { Form, Input, Select, Button, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BankOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { FormProps } from 'antd';
import { requestSignupOTP } from '../../../services';
import './SignupForm.css';

const { Option } = Select;

interface SignupFormValues {
    firstName: string;
    lastName: string;
    role: string;
    department: string;
    mobileNumber: string;
    email: string;
    password: string;
    confirmPassword: string;
}

const SignupForm: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [countryCode, setCountryCode] = useState('+353');
    const navigate = useNavigate();

    const handleFormChange = () => {
        form.validateFields({ validateOnly: true })
            .then(() => {})
            .catch(() => {});
    };

    const validateMobileNumber = (_: any, value: string) => {
        if (!value) {
            return Promise.reject(new Error('Please enter your mobile number'));
        }

        if (countryCode === '+353') {
            if (!/^8\d{8}$/.test(value)) {
                return Promise.reject(new Error('Please enter a valid Irish mobile number (e.g., 87 123 4567)'));
            }
        } else if (countryCode === '+91') {
            if (!/^[6-9]\d{9}$/.test(value)) {
                return Promise.reject(new Error('Please enter a valid Indian mobile number (e.g., 98806 23282)'));
            }
        }

        return Promise.resolve();
    };

    const onFinish: FormProps<SignupFormValues>['onFinish'] = async (values) => {
        setLoading(true);
        try {
            const formattedMobile = `${countryCode}${values.mobileNumber}`;

            const result = await requestSignupOTP({
                firstName: values.firstName,
                lastName: values.lastName,
                role: values.role,
                department: values.department,
                phoneNumber: formattedMobile,
                email: values.email,
                password: values.password,
            });

            if (result.success) {
                message.success(result.message || 'OTP sent successfully!');

                navigate('/otp', {
                    state: {
                        mobileNumber: formattedMobile,
                        signupData: values,
                    }
                });
            } else {
                message.error(result.message);
            }
        } catch (error) {
            message.error('Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const validatePasswordMatch = (_: any, value: string) => {
        if (!value || form.getFieldValue('password') === value) {
            return Promise.resolve();
        }
        return Promise.reject(new Error('The two passwords do not match!'));
    };

    const handleCountryCodeChange = (value: string) => {
        setCountryCode(value);
        form.validateFields(['mobileNumber']);
    };

    return (
        <Form
            form={form}
            name="signup"
            onFinish={onFinish}
            onValuesChange={handleFormChange}
            layout="vertical"
            autoComplete="off"
            requiredMark={true}
            className="signup-form"
        >
            <Row gutter={16}>
                <Col xs={24}>
                    <Form.Item
                        name="firstName"
                        label="First Name"
                        rules={[
                            { required: true, message: 'Please enter your first name' },
                            { min: 2, message: 'First name must be at least 2 characters' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                            placeholder="Enter first name"
                            size="large"
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item
                name="lastName"
                label="Last Name"
                rules={[
                    { required: true, message: 'Please enter your last name' },
                    { min: 2, message: 'Last name must be at least 2 characters' }
                ]}
            >
                <Input
                    prefix={<UserOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder="Enter last name"
                    size="large"
                />
            </Form.Item>

            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select your role' }]}
                    >
                        <Select
                            placeholder="Select role"
                            size="large"
                            suffixIcon={<SafetyOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                        >
                            <Option value="admin">Admin</Option>
                        </Select>
                    </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                    <Form.Item
                        name="department"
                        label="Department"
                        rules={[{ required: true, message: 'Please select your department' }]}
                    >
                        <Select
                            placeholder="Select department"
                            size="large"
                            suffixIcon={<BankOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                        >
                            <Option value="it">IT</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item label="Mobile Number" required className="mobile-form-item">
                        <div className="mobile-input-group">
                            <Select
                                value={countryCode}
                                onChange={handleCountryCodeChange}
                                size="large"
                                className="country-code-select"
                                popupMatchSelectWidth={false}
                            >
                                <Option value="+353">+353</Option>
                                <Option value="+91">+91</Option>
                            </Select>
                            <Form.Item
                                name="mobileNumber"
                                noStyle
                                rules={[{ validator: validateMobileNumber }]}
                            >
                                <Input
                                    placeholder={countryCode === '+353' ? '87 123 4567' : '98806 23282'}
                                    size="large"
                                    className="mobile-input-field"
                                    maxLength={countryCode === '+353' ? 9 : 10}
                                />
                            </Form.Item>
                        </div>
                    </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                    <Form.Item
                        name="email"
                        label="Email Address"
                        rules={[
                            { required: true, message: 'Please enter your email' },
                            { type: 'email', message: 'Please enter a valid email address' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                            placeholder="user@company.com"
                            size="large"
                            type="email"
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: true, message: 'Please enter your password' },
                            { min: 8, message: 'Password must be at least 8 characters' },
                            {
                                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                                message: 'Password must contain uppercase, lowercase, number, and special character (@,$,!,%,*,?,&)'
                            }
                        ]}
                        hasFeedback
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                            placeholder="Enter password"
                            size="large"
                        />
                    </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                    <Form.Item
                        name="confirmPassword"
                        label="Confirm Password"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Please confirm your password' },
                            { validator: validatePasswordMatch }
                        ]}
                        hasFeedback
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                            placeholder="Confirm password"
                            size="large"
                        />
                    </Form.Item>
                </Col>
            </Row>

            <div className="signup-form-footer">
                <div className="signup-footer-text">
                    <span style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14 }}>
                        Already have an account?{' '}
                        <a href="/login" style={{ color: '#1890ff', fontWeight: 500, textDecoration: 'underline' }}>
                            Log In
                        </a>
                    </span>
                </div>
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    // disabled={!isFormValid || loading}
                    className="signup-submit-btn"
                >
                    Sign Up
                </Button>
            </div>
        </Form>
    );
};

export default SignupForm;