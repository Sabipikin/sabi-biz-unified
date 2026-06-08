import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';

export default function SubscriptionsScreen() {
  const { data, isLoading, isError } = useQuery(['billing-current-plan'], async () => {
    const res = await api.get(Endpoints.BILLING.CURRENT_PLAN);
    return res.data;
  });
  const invoicesQuery = useQuery(['billing-invoices'], async () => {
    const res = await api.get(Endpoints.BILLING.INVOICES);
    return res.data;
  });

  const payload = data?.data || {};
  const subscription = payload.subscription || {};
  const plans = payload.plans || [];
  const usage = payload.usage || {};
  const invoices = invoicesQuery.data?.data || [];

  const upgradeMutation = useMutation(async (plan: string) => {
    const res = await api.post(Endpoints.BILLING.UPGRADE, { plan, billingCycle: subscription.billing_cycle || 'monthly' });
    return res.data;
  }, {
    onSuccess: (result: any) => {
      const url = result?.data?.authorization_url;
      if (url) Linking.openURL(url);
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Billing</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading billing.</Text>}
      <View style={styles.card}>
        <Text style={styles.label}>Current Plan</Text>
        <Text style={styles.value}>{subscription.plan_name || 'Trial'}</Text>
        <Text>{subscription.status || 'trialing'} | {subscription.billing_cycle || 'monthly'}</Text>
      </View>
      <Text style={styles.sectionTitle}>Usage</Text>
      {Object.entries(usage).map(([key, metric]: any) => (
        <View key={key} style={styles.card}>
          <Text style={styles.label}>{key.replace(/_/g, ' ')}</Text>
          <Text>{metric.used || 0} / {metric.limit == null ? 'Unlimited' : metric.limit}</Text>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Plans</Text>
      {plans.map((plan: any) => (
        <View key={plan.id} style={styles.card}>
          <Text style={styles.value}>{plan.name}</Text>
          <Text>{plan.description}</Text>
          <Text style={styles.price}>{plan.slug === 'enterprise' ? 'Custom' : `NGN ${Number(plan.monthly_price || 0).toLocaleString()}/mo`}</Text>
          <TouchableOpacity
            style={[styles.button, (plan.slug === subscription.plan_slug || plan.slug === 'enterprise') && styles.disabled]}
            disabled={plan.slug === subscription.plan_slug || plan.slug === 'enterprise' || upgradeMutation.isLoading}
            onPress={() => upgradeMutation.mutate(plan.slug)}
          >
            <Text style={styles.buttonText}>{plan.slug === subscription.plan_slug ? 'Current Plan' : 'Choose Plan'}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Billing History</Text>
      {invoices.length ? invoices.map((invoice: any) => (
        <View key={invoice.id} style={styles.item}>
          <Text style={styles.name}>{invoice.invoice_number || invoice.id}</Text>
          <Text>{invoice.status} | NGN {Number(invoice.amount || 0).toLocaleString()}</Text>
        </View>
      )) : <Text>No billing invoices yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 10 },
  label: { color: '#666', textTransform: 'capitalize' },
  value: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  price: { fontWeight: '700', marginVertical: 8 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  button: { backgroundColor: '#2563eb', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.55 },
});
